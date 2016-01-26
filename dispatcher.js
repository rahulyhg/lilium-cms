var Admin = require('./backend/admin.js');
var HTMLServer = require('./frontend/htmlserver.js');
var Endpoints = require('./endpoints.js');
var LiveVars = require('./livevars.js');
var _c = require('./config.js');
var log = require('./log.js');

var Dispatcher = function() {
	this.dispatch = function(cli) {
		cli.touch('dispatcher.dispatch');

		if (cli.routeinfo.admin) {
			if (cli.userinfo.loggedin && cli.userinfo.dashaccess) {
				Admin.serveDashboard(cli);
			} else {
				if (_c.default.usability.admin.loginIfNotAuth) {
					cli.redirect(_c.default.server.url + "/login?cause=401", false);
				} else {
					cli.throwHTTP(401, "Unauthorized");
				}
			}
		} else if (cli.routeinfo.login) {
			Admin.serveLogin(cli);
		} else if (cli.routeinfo.livevars) {
			LiveVars.handleRequest(cli);
		}else if (Endpoints.isRegistered(cli.routeinfo.path[0], 'GET')) {
			Endpoints.execute(cli.routeinfo.path[0], 'GET', cli);
		} else {
			HTMLServer.serveClient(cli);
		}
	};

	this.dispost = function(cli) {
		cli.touch("dispatcher.dispost");

		if (Endpoints.isRegistered(cli.routeinfo.path[0], 'POST')) {
			if (cli.routeinfo.admin) {
				if (cli.userinfo.loggedin && cli.userinfo.dashaccess) {
					Endpoints.execute(cli.routeinfo.path[0], 'POST', cli);
				} else {
						cli.throwHTTP(401, "Unauthorized");
				}
			} else {
				Endpoints.execute(cli.routeinfo.path[0], 'POST', cli);
			}
		} else {
			log("Dispatcher","Endpoint not registered : " + cli.routeinfo.path[0]);
			cli.debug();
		}
	};

	var init = function() {

	};

	init();
};

module.exports = new Dispatcher();
