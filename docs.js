const markdown = require('markdown').markdown;
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const log = require('./log.js');
const db = require('./includes/db.js');
const fileserver = require('./fileserver.js');
const config = require('./config.js');
const Admin = require('./backend/admin.js');
const endpoint = require('./endpoints.js');

let libraries = [];
class LMLDocs {
    compile(file, cb) {
        fileserver.readFile(file, (content) => {
            cb(md.render(content));
        }, false, 'utf8');
    };

    compileDirectory(cb) {
        const _c = config.default();
        const readDir = _c.server.base + "backend/dynamic/docs/";
        const writeDir = _c.server.html + "/lmldoc/";

        let index = -1;
        log('Docs', "Compiling markdown");
        fileserver.listDirContent(readDir, (content, err) => {
            libraries = content;
            let next = () => {
                if (++index == content.length) {
                    cb && cb();
                } else {
                    that.compile(readDir + content[index], (markup, err) => {
                        fileserver.dumpToFile(writeDir + content[index].split('/').pop() + ".doc", markup, next);
                    });
                }
            };

            next();
        });
    };

    compileIndex(cb) {
        const _c = config.default();
        const readDir = _c.server.base + "backend/dynamic/docs.lml";
        const writeDir = _c.server.html + "/lmldoc/index.html";

        let links = [];
        for (var i = 0; i < libraries.length; i++) {
            links.push(libraries[i].split('/').pop().split('.').shift());
        }

        log('Docs', "Compiling template page");
        fileserver.readFile(readDir, (lmlstr) => {
            require('./lml/compiler.js').compileToString(_c.id, lmlstr, {
                config : _c,
                libs : links,
                rootDir : _c.server.base + "backend/dynamic/"
            }, (markup) => {
                fileserver.dumpToFile(writeDir, markup, () => {
                    cb && cb();
                }, 'utf8');
            });
        }, false, 'utf8');
    };

    GET(cli) {
        if (!cli.userinfo.loggedin) {return cli.response.end();}

        const writeDir = config.default().server.html + "/lmldoc/";
        var docIndex = cli.routeinfo.path[1];
        if (!docIndex) {
            fileserver.pipeFileToClient(cli, writeDir + "index.html", undefined, true, 'text/html');
        } else {
            fileserver.pipeFileToClient(cli, writeDir + docIndex + ".md.doc", undefined, true, 'text/html');
        }
    };
}

const that = new LMLDocs();
module.exports = that;
