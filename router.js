var url = require('url');
var pathlib = require('path');
var session = require('./session.js');
var _c = require('./config.js');

var Router = function () {
    this.parseClientObject = function (cli) {
        cli.touch('router.parseClientObject');

        pObj = url.parse(cli.request.url, true);
        cli.routeinfo.fileExt = pathlib.extname(pObj.pathname);
        cli.routeinfo.isStatic = cli.routeinfo.fileExt !== '';

        cli.routeinfo.fullpath = pObj.pathname[pObj.pathname.length - 1] == '/' ?
            pObj.pathname.substr(0, pObj.pathname.length - 1) :
            pObj.pathname;

        _c.fetchConfigFromCli(cli);
        if (!cli._c) {
            cli.throwHTTP(404, "Not Found");
            return false;
        }

        cli.routeinfo.path = pObj.pathname.replace(/^\/?|\/?$/g, "").split('/');
        for (var i = 0; i < (cli.routeinfo.rootdomain.match(/\//g) || []).length; i++) {
            cli.routeinfo.path.shift();
        }

        cli.routeinfo.relsitepath = "/" + cli.routeinfo.path.join('/');
        cli.routeinfo.params = pObj.query;
        cli.routeinfo.admin = cli.routeinfo.path.length != 0 && cli.routeinfo.path[0] === cli._c.paths.admin;
        cli.routeinfo.login = cli.routeinfo.path.length != 0 && cli.routeinfo.path[0] === cli._c.paths.login;
        cli.routeinfo.livevars = cli.routeinfo.path.length != 0 && cli.routeinfo.path[0] === cli._c.paths.livevars;
        cli.routeinfo.root = pObj.pathname == "/";

        if (!cli.routeinfo.isStatic) {
            session.injectSessionInCli(cli);
        };

        return true;
    };

    var init = function () {

    };

    init();
};

module.exports = new Router();