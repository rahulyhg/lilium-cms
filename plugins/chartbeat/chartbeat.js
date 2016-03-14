var log = undefined;
var config = undefined;
var Petal = undefined;
var dashboard = undefined;

var Chartbeat = function() {
	this.iface = new Object();

	var initRequires = function(abspath) {
		log = require(abspath + "log.js");
		config = require(abspath + "config.js");
		Petal = require(abspath + "petal.js");
		dashboard = require(abspath + "dashboard.js");
	};

	var createPetals = function() {

	};

	var hookOnDashboard = function() {

	};

	this.register = function(_c, info, callback) {
		initRequires(_c.default().server.base);
		log('Chartbeat', "Initializing Chartbeat plugin");

		log('Chartbeat', 'Creating petal identifiers');
		createPetals();
		
		log('Chartbeat', 'Hooking on dashboard creation');
		hookOnDashboard();

		log('Chartbeat', 'All done');
		callback();
	};
};

module.exports = new Chartbeat();
