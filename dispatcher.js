var Admin = require('./backend/admin.js');
var HTMLServer = require('./frontend/htmlserver.js');
var Endpoints = require('./endpoints.js');
var LiveVars = require('./livevars.js');
var log = require('./log.js');
var entities = require('./entities.js');
var api = require('./api.js');
var rewriter = require('./rewriter.js');
var clerk = require('./clerk.js');

var Dispatcher = function () {
    this.dispatch = function (cli) {
        cli.touch('dispatcher.dispatch');
        if (cli.routeinfo.front) {
            clerk.serve(cli);
        } else if (cli.routeinfo.admin) {
            if (cli.userinfo.loggedin && entities.isAllowed(cli.userinfo, 'dash')) {
                Admin.serveDashboard(cli);
            } else {
                if (cli._c.usability.admin.loginIfNotAuth) {
                    cli.redirect(cli._c.server.url + "/login?to=" + cli._c.server.protocol + cli._c.server.url + cli.routeinfo.fullpath, false);
                } else {
                    cli.throwHTTP(401, "Unauthorized", true);
                }
            }
        } else if (cli.routeinfo.login) {
            Admin.serveLogin(cli);
        } else if (cli.routeinfo.livevars) {
            if (cli.userinfo.loggedin) {
                LiveVars.handleRequest(cli);
            } else {
                cli.throwHTTP(401, undefined, true);
            }
        } else if (rewriter.rewrite(cli)) {

        } else if (Endpoints.isRegistered(cli.routeinfo.configname, cli.routeinfo.path[0], 'GET')) {
            Endpoints.execute(cli.routeinfo.path[0], 'GET', cli);
        } else if (Endpoints.hasWild(cli._c.id, 'GET') && Endpoints.execute("*", 'GET', cli)) {
            // noOp
        } else if (cli.routeinfo.isStatic) {
            HTMLServer.serveStatic(cli);
        } else {
            HTMLServer.serveClient(cli);
        }
    };

    this.disput = function(cli) {
        cli.touch('dispatcher.disput');

        if (cli.userinfo.loggedin) {
            if (cli.routeinfo.admin) {
                if (Admin.adminEndpointRegistered(cli.routeinfo.path[1], 'PUT')) {
                    Admin.handleAdminEndpoint(cli);
                } else {
                    cli.throwHTTP(404, undefined, true);
                }
            } else {
                if (Endpoints.isRegistered(cli._c.id, cli.routeinfo.path[0], 'PUT')) {
                    Endpoints.execute(cli.routeinfo.path[0], 'PUT', cli);
                } else if (Endpoints.hasWild(cli._c.id, 'PUT')) {
                    Endpoints.execute("*", 'PUT', cli);
                } else {
                    cli.throwHTTP(404, undefined, true);
                }
            }
        }
    }

    this.disdel = function(cli) {
        cli.touch('dispatcher.disdel');

        if (cli.userinfo.loggedin) {
            if (cli.routeinfo.admin) {
                if (Admin.adminEndpointRegistered(cli.routeinfo.path[1], 'DELETE')) {
                    Admin.handleAdminEndpoint(cli);
                } else {
                    cli.throwHTTP(404, undefined, true);
                }
            } else {
                if (Endpoints.isRegistered(cli._c.id, cli.routeinfo.path[0], 'DELETE')) {
                    Endpoints.execute(cli.routeinfo.path[0], 'DELETE', cli);
                } else if (Endpoints.hasWild(cli._c.id, 'DELETE')) {
                    Endpoints.execute("*", 'DELETE', cli);
                } else {
                    cli.throwHTTP(404, undefined, true);
                }
            }
        }
    }

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
        } else if (Endpoints.hasWild(cli._c.id, 'POST')) {
            Endpoints.execute("*", 'POST', cli);
        } else {
            log("Dispatcher", "Endpoint not registered : " + cli.routeinfo.path[0]);
            cli.throwHTTP(403, undefined, true);
        }
    };

    var init = function () {

    };

    init();
};

module.exports = new Dispatcher();
