var log = undefined;
var endpoints = undefined;
var admin = undefined;

var Docs = function() {
	this.iface = new Object();

	var initRequires = function(abspath) {
		log = require(abspath + "log.js");
		endpoints = require(abspath + "endpoints.js");
		admin = require(abspath + '/backend/admin.js');
	};

	var registerEndpoint = function() {
		admin.registerAdminEndpoint('docs', 'GET', function(cli) {
			cli.touch('docs.GET.docs');

			cli.debug();
		});
	};

	this.unregister = function(callback) {
		admin.unregisterAdminEndpoint('docs', 'GET');
		callback();
	};

	this.register = function(_c, info, callback) {
		initRequires(_c.default.server.base);
		log("Docs", "Documentation was initiated");
		registerEndpoint();
		
		log("Docs", "Documentation was initiated");
		callback();
	};
};

module.exports = new Docs();
