var filelogic = require('../filelogic.js');

var Admin = function() {
	this.serveDashboard = function(cli) {
		cli.touch('admin.serverDashboard');
		filelogic.runLogic(cli);
	};

	this.serveLogin = function(cli) {
		cli.touch('admin.serverLogin');
		filelogic.runLogic(cli);
	};

	var init = function() {

	};

	init();
};

module.exports = new Admin();
