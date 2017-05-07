var Admin = require('./backend/admin.js');
var HTMLServer = require('./frontend/htmlserver.js');
var Endpoints = require('./endpoints.js');
var LiveVars = require('./livevars.js');
var log = require('./log.js');
var entities = require('./entities.js');
var api = require('./api.js');
var rewriter = require('./rewriter.js');

var Dispatcher = function () {
    this.dispatch = function (cli) {
        cli.touch('dispatcher.dispatch');
        if (cli.routeinfo.isStatic) {
            HTMLServer.serveStatic(cli);
        } else if (cli.routeinfo.admin) {
            if (cli.userinfo.loggedin && entities.isAllowed(cli.userinfo, 'dash')) {
                Admin.serveDashboard(cli);
            } else {
                if (cli._c.usability.admin.loginIfNotAuth) {
                    cli.redirect(cli._c.server.url + "/login?cause=401", false);
                } else {
                    cli.throwHTTP(401, "Unauthorized", true);
                }
            }
        } else if (cli.routeinfo.login) {
            Admin.serveLogin(cli);
        } else if (cli.routeinfo.api) {
            api.serveApi(cli);
        } else if (cli.routeinfo.livevars) {
            LiveVars.handleRequest(cli);
        } else if (rewriter.rewrite(cli)) {
        } else if (Endpoints.isRegistered(cli.routeinfo.configname, cli.routeinfo.path[0], 'GET')) {
            Endpoints.execute(cli.routeinfo.path[0], 'GET', cli);
        } else {
            HTMLServer.serveClient(cli);
        }
    };

    this.dispost = function (cli) {
        cli.touch("dispatcher.dispost");

        if (Endpoints.isRegistered(cli._c.id, cli.routeinfo.path[0], 'POST')) {
            if (cli.routeinfo.admin) {
                if (cli.userinfo.loggedin && entities.isAllowed(cli.userinfo, 'dash')) {
                    Endpoints.execute(cli.routeinfo.path[0], 'POST', cli);
                } else {
                    cli.throwHTTP(401, "Unauthorized", true);
                }
            } else {
                Endpoints.execute(cli.routeinfo.path[0], 'POST', cli);
            }
        } else {
            log("Dispatcher", "Endpoint not registered : " + cli.routeinfo.path[0]);
            cli.debug();
        }
    };

    var init = function () {

    };

    init();
};

module.exports = new Dispatcher();
