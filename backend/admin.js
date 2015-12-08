var Admin = function() {
	this.serveDashboard = function(cli) {
		cli.touch('admin.serverDashboard');
		cli.debug();
	};

	this.serveLogin = function(cli) {
		cli.touch('admin.serverLogin');
		cli.debug();	
	};

	var init = function() {

	};

	init();
};

module.exports = new Admin();
