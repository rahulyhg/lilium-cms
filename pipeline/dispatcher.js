const Admin = require('../backend/admin.js');
const HTMLServer = require('./htmlserver.js');
const Endpoints = require('./endpoints.js');
const LiveVars = require('./livevars.js');
const entities = require('../lib/entities.js');
const rewriter = require('./rewriter.js');
const hooks = require('../lib/hooks');

class Dispatcher {
    dispatch(cli) {
        cli.touch('dispatcher.dispatch');
        hooks.fire('request_dispatched', cli);

        try {
            if (cli.routeinfo.admin) {
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
        } catch (err) {
            log('Dispatcher', 'Could not dispatch request', 'err');
            cli.crash(err);
        }
    };

    disput(cli) {
        cli.touch('dispatcher.disput');
        hooks.fire('request_dispatched', cli);

        try {
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
            } else {
                cli.refuse();
            }
        } catch (err) {
            log('Dispatcher', 'Could not dispatch request', 'err');
            cli.crash(err);
        }
    }

    disdel(cli) {
        cli.touch('dispatcher.disdel');
        hooks.fire('request_dispatched', cli);

        try {
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
            } else {
                cli.refuse();
            }
        } catch (err) {
            log('Dispatcher', 'Could not dispatch request', 'err');
            cli.crash(err);
        }
    }

    dispost(cli) {
        cli.touch("dispatcher.dispost");
        hooks.fire('request_dispatched', cli);

        try {
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
                cli.refuse();
            }
        } catch (err) {
            log('Dispatcher', 'Could not dispatch request', 'err');
            cli.crash(err);
        }
    };
};

module.exports = new Dispatcher();
