const Admin = require('./backend/admin.js');
const LML2 = require('./lml/compiler.js');
const fileserver = require('./fileserver.js');

const pathPrefix = "/backend/dynamic/snip/";
const extPrefix = ".snip.lml";

// Doesn't cache requests and files
class LMLSnip {
    static renderSnip(_c, snip, cb, extra) {
        let fullpath = _c.server.base + pathPrefix + snip + extPrefix;
        extra = extra || {};
        extra.config = _c;
        extra.name = extra.name || snip;

        fileserver.readFile(fullpath, (compilee) => {
            LML2.compileToString(_c.id, compilee, extra, (markup) => {
                cb(undefined, markup);
            });
        });
    }

    adminGET(cli) {
        let snipname = cli.routeinfo.path[2];
        let extra = cli.routeinfo.params;

        fileserver.fileExists(cli._c.server.base + pathPrefix + snipname + extPrefix, function(exists) {
            if (exists) {
                LMLSnip.renderSnip(cli._c, snipname, (err, html) => {
                    cli.response.writeHead(200, {"Content-Type" : "text/html"});
                    cli.response.end(html);
                }, extra);
            } else {
                cli.response.writeHead(404);
                cli.response.end();
            }
        });
    }
};

module.exports = new LMLSnip();
