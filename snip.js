const log = require('./log.js');
const Admin = require('./backend/admin.js');
const LML2 = require('./lml/compiler.js');
const fileserver = require('./fileserver.js');

const pathPrefix = "/backend/dynamic/snip/";
const extPrefix = ".snip.lml";

// Doesn't cache requests and files
class LMLSnip {
    static renderSnip(_c, snip, cb) {
        let fullpath = _c.server.base + pathPrefix + snip + extPrefix;
        fileserver.readFile(fullpath, (compilee) => {
            LML2.compileToString(_c.id, compilee, {
                config : _c,
                snipname : snip
            }, (markup) => {
                cb(undefined, markup);
            });
        });
    }

    GET(cli) {
        let snipname = cli.routeinfo.path[2];
        fileserver.fileExists(cli._c.server.base + pathPrefix + snipname + extPrefix, function(exists) {
            if (exists) {
                LMLSnip.renderSnip(cli._c, snipname, (err, html) => {
                    cli.response.writeHead(200, {"Content-Type" : "text/html"});
                    cli.response.end(html);
                });
            } else {
                cli.response.writeHead(404);
                cli.response.end();
            }
        });
    }

    setupController() {
        Admin.registerAdminEndpoint('snips', 'GET', this.GET);
    }
};

module.exports = new LMLSnip();
