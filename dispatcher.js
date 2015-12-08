var Admin = require('./backend/admin.js');
var HTMLServer = require('./frontend/htmlserver.js'); 
var _c = require('./config.js');

var Dispatcher = function() {
	this.dispatch = function(cli) {
		if (cli.routeinfo.admin) {
			if (cli.userinfo.loggedin && cli.userinfo.dashaccess) {
				admin.serveDashboard(cli);
			} else {
				if (_c.default.usability.admin.loginIfNotAuth) {
					cli.redirect(_c.default.server.url + "/login?cause=401", false);
				} else {
					cli.throwHTTP(401, "Unauthorized");
				}
			}
		} else {
			HTMLServer.serveClient(cli);
		}
	};	

	var init = function() {

	};

	init();
};

module.exports = new Dispatcher();
