var url = require('url');
var pathlib = require('path');
var session = require('./session.js');
var _c = require('./config.js');
var clerk = require('./clerk.js');

var Router = function () {
    this.parseClientObject = function (cli, cb) {
        cli.touch('router.parseClientObject');

        pObj = url.parse(cli.request.url, true);
        cli.routeinfo.fileExt = pathlib.extname(pObj.pathname);
        cli.routeinfo.isStatic = cli.routeinfo.fileExt !== '';
        cli.routeinfo.paramtrail = pObj.search;

        cli.routeinfo.fullpath = pObj.pathname[pObj.pathname.length - 1] == '/' ?
            pObj.pathname.substr(0, pObj.pathname.length - 1) :
            pObj.pathname;

        _c.fetchConfigFromCli(cli);
        if (!cli._c) {
            cli.throwHTTP(404, "", true);
            return false;
        }

        cli.routeinfo.path = pObj.pathname.replace(/^\/?|\/?$/g, "").split('/');

        if (cli.routeinfo.path.length == 0) {
            cli.routeinfo.path = [""];
        }

        cli.routeinfo.relsitepath = "/" + cli.routeinfo.path.join('/');
        cli.routeinfo.params = pObj.query;
        cli.routeinfo.admin = cli.routeinfo.path[0] === cli._c.paths.admin;
        cli.routeinfo.login = cli.routeinfo.path[0] === cli._c.paths.login;
        cli.routeinfo.front = cli.routeinfo.path[0] === "_";
        cli.routeinfo.api = cli.routeinfo.path[0] === "api";
        cli.routeinfo.livevars = cli.routeinfo.path[0] === cli._c.paths.livevars;
        cli.routeinfo.root = cli.routeinfo.relsitepath.relsitepath == "/";
        cli.routeinfo.async = cli.routeinfo.params.async || false;

        cli.routeinfo.url = cli._c.server.protocol + "//" + cli.request.headers.host + pObj.pathname;
        cli.ip = cli.request.headers["x-real-ip"] || cli.request.connection.remoteAddress;

        cli.response.setHeader("Backend", "Lilium");

        if (!cli.routeinfo.isStatic && !cli.routeinfo.front && !cli.routeinfo.api) {
            session.injectSessionInCli(cli, cb);
        } else if (cli.routeinfo.api) {
            cli.apitoken = cli.request.headers.ltk;
            cli.apisession = false;
            if (cli.apitoken) {
                require('./api.js').getSession(cli.apitoken, (session) => {
                    cli.apisession = session;
                    cb(!!session);
                });
            } else {
                cb(false);
            }
        } else if (cli.routeinfo.front) {
            clerk.greet(cli, cb);
        } else {
            cb(false);
        };
    };

    var init = function () {

    };

    init();
};

module.exports = new Router();
