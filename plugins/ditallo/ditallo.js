var log = undefined;
var endpoints = undefined;

var SayHi = function() {
	this.iface = new Object();

	var initRequires = function(abspath) {
		log = require(abspath + "log.js");
		endpoints = require(abspath + "endpoints.js");
	};

	var registerEndpoint = function() {
		endpoints.register('ditallo', 'GET', function(cli) {
			cli.sendJSON({
				"message" : "NALUUU!",
				"sentFrom" : "DitAllo"
			});
		});
	};

	this.unregister = function(callback) {
		log("DitAllo", "Au revoir!");

		callback();
	};

	this.register = function(_c, info, callback) {
		initRequires(_c.default.server.base);

		log("DitAllo", "Allo ici!");
		registerEndpoint();

		callback();
	};
};

module.exports = new SayHi();
