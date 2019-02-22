const path = require('path');
const makeIndex = require(path.join(global.liliumroot || __dirname, "apps", "lilium", "index.html"));
const db = require('./db');
const fs = require('fs');
const cachefront = require('./cachefront');
const networkInfo = require('../network/info.js');
const isElder = networkInfo.isElderChild();

const webappImports = {};

const APP_DIRECTORY_PATH = path.join(global.liliumroot, "apps", "lilium")
const APP_MAIN_PATH = path.join(APP_DIRECTORY_PATH, "main.js")

class V4 {
    serveV4Index(cli) {
        cli.response.writeHead(200, { "Content-Type" : "text/html" });
        cli.response.end(makeIndex(cli));
    }

    makeAppMainDependency(_c) {
        try {
            fs.mkdirSync('./tmp');
        } catch (err) {}

        webappImports[_c.id] = [];
        this.addWebAppDependency(_c, APP_MAIN_PATH);
    }

    addWebAppDependency(_c, abspath) {
        if (!isElder) { return; }

        if (_c == "*") {
            require('./config').getAllSites().forEach(x => this.addWebAppDependency(x, abspath));
        } else {
            webappImports[_c.id].push(abspath);

            log('V4', 'Writing web app entry point with ' + webappImports[_c.id].length + ' files for website ' + _c.website.sitetitle, 'info');
            fs.writeFileSync(
                path.join(liliumroot, "tmp", "app" + _c.uid + '.js'), 
                webappImports[_c.id].map(file => `import "${file}";`).join('\n'),
                { encoding : 'utf8' }
            );
        }
    }

    getWebAppDependencies(_c) {
        return webappImports[_c.id] || [];
    }

    dumpV3UrlInFront(_c, done) {
        const nextPost = cur => {
            cur.next((err, post) => {
                if (!post) {
                    return done && done();
                }
        
                if (post.v3url == post.url) {
                    setImmediate(() => nextPost(cur));
                } else {
                    cachefront.setURL(post.v3url, undefined, undefined, undefined, () => {
                        setImmediate(() => nextPost(cur));
                    }, {
                        status : 301,
                        headers : {
                            Location : post.v4url
                        }
                    });
                }
            });
        };

        db.find(_c, 'content', { v3url : { $exists : 1 }, url : { $exists : 1 } }, [], (err, cur) => {
            nextPost(cur);
        }, { v3url : 1, url : 1 });
    }

    updateV3Redirection(v3url, url) {
        cachefront.setURL(v3url, undefined, undefined, undefined, () => { }, {
            status : 301,
            headers : {
                Location : url
            }
        });
    }
}

module.exports = V4;
