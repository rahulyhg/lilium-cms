var log = undefined;
var endpoints = undefined;

var SayHi = function() {
	this.iface = new Object();

	var initRequires = function(abspath) {
		log = require(abspath + "log.js");
		endpoints = require(abspath + "endpoints.js");
	};

	var registerEndpoint = function() {
		endpoints.register('sayhi', 'GET', function(cli) {

		});
	};

	this.unregister = function(callback) {
		log("SayHi", "Goodbye!");
		endpoints.unregister('sayhi', 'GET');
		callback();
	};

	this.register = function(_c, info, callback) {
		initRequires(_c.default().server.base);
		log("SayHi", "Hi there!");
		registerEndpoint();
		callback();
	};
};

module.exports = new SayHi();
