var log = undefined;
var config = undefined;
var Petal = undefined;
var dashboard = undefined;
var hooks = undefined;

var Chartbeat = function() {
	this.iface = new Object();

	var initRequires = function(abspath) {
		log = require(abspath + "log.js");
		config = require(abspath + "config.js");
		Petal = require(abspath + "petal.js");
		dashboard = require(abspath + "dashboard.js");
		hooks = require(abspath + "hooks.js");
	};

	var createPetals = function() {
		Petal.register('dashboardChartbeat', config.default().server.base + "plugins/chartbeat/dynamic/dash.petal");
	};

	var hookOnDashboard = function() {
		dashboard.registerDashPetal('dashboardChartbeat', 50);
	};

	var registerSettings = function() {
		hooks.bind('settings_form_bottom', 400, function(pkg) {
			pkg.form.add('chartbeat-sep', 'title', {displayname:"Chartbeat"})
			.add('chartbeat_api_key', 'text', {displayname:"API Key"}, {required:false})
			.add('chartbeat_host', 'text', {displayname:"Host"}, {required:false})
			.add('chartbeat_section', 'text', {displayname:"Section (blank if none)"}, {required:false});
		});
	};

	this.register = function(_c, info, callback) {
		initRequires(_c.default().server.base);
		log('Chartbeat', "Initializing Chartbeat plugin");

		log('Chartbeat', "Adding config to settings page");
		registerSettings();

		log('Chartbeat', 'Creating petal identifiers');
		createPetals();
		
		log('Chartbeat', 'Hooking on dashboard creation');
		hookOnDashboard();

		log('Chartbeat', 'All done');
		callback();
	};
};

module.exports = new Chartbeat();
