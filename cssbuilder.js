const lessLib = require('less');
const fs = require('fs');
const pathLib = require('path');

const filequeue = [];

class CSSBuilder {
    build(inputdir, outputfile, options = {}, done) {
        const now = Date.now();

        fs.readdir(inputdir, { encoding : 'utf8' }, (err, files) => {
            if (err) {
                log('Less', 'Failed to compile Less, missing directory : ' + inputdir, 'err');
                done && done(err);
            } else {
                const filestring = files.filter(x => x.endsWith('.less')).map(x => `@import "${pathLib.join(inputdir, x)}";`).join('\n');

                lessLib.render(filestring, { compress : options.compress || false }, (err, result) => {
                    if (err) {
                        log('Less', 'Failed to compile Less, error : ' + err, 'err');
                        done && done(err);
                    } else {
                        fs.writeFile(outputfile, result.css, { encoding : 'utf8' }, err => {
                            if (err) {
                                log('Less', 'Failed to compile Less, file output error : ' + err, 'err');
                                done && done(err);
                            } else {
                                log('Less', 'Compiled Less file into CSS in ' + (Date.now() - now) + 'ms', 'success');
                                done && done();
                            }
                        });
                    }
                });
            }
        });
    }

    adminPOST(cli) {
        if (cli.hasRightOrRefuse('lilium')) {
            if (cli.routeinfo.path[2] == "lilium") {
                this.build(
                    pathLib.join(liliumroot, 'apps', 'lilium', 'less'), 
                    pathLib.join(liliumroot, 'backend', 'static', 'compiled', 'v4.css'), 
                    { 
                        compress : require('./config').default().env == "prod" 
                    }, 
                err => {
                    err && log('Core', 'Error compiling V4 less files to CSS : ' + err, 'err');
                    cli.sendJSON({ success : !err, err });
                });
            }
        }
    }

    pushToQueue(inputdir, outputfile, options) {
        filequeue.push({ inputdir, outputfile, options });
    }

    buildQueue(done) {
        let index = -1;
        const next = () => {
            if (++index == filequeue.length) {
                return done && done();
            } 

            this.build(...filequeue[index], () => {
                next();
            });
        };

        next();
    }
}

module.exports = new CSSBuilder();