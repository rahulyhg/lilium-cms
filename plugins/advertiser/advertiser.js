var log = undefined;
var endpoints = undefined;
var hooks = undefined;
var entities = undefined;
var conf = undefined;
var Admin = undefined;
var filelogic = undefined;

var SayHi = function() {
	this.iface = new Object();

	var initRequires = function(abspath) {
		log = require(abspath + "log.js");
		endpoints = require(abspath + "endpoints.js");
		hooks = require(abspath + "hooks.js");
		entities = require(abspath + "entities.js");
		Admin = require(abspath + 'backend/admin.js')
		filelogic = require(abspath + 'filelogic.js')
	};

	var registerEndpoint = function() {

		endpoints.register('advertiser', 'GET', function(cli) {
			cli.debug();
		});
	};

	var handleAdminGet = function(cli) {
		filelogic.serveLmlPage(cli);
	}

	var handleAdminPost = function(cli) {

	}

	var registerHooks = function() {
		Admin.registerAdminEndpoint('advertiser', 'GET', handleAdminGet);
		Admin.registerAdminEndpoint('advertiser', 'POST', handleAdminPost);

		hooks.bind('user_loggedin', 200, function(cli) {
			// Check if user is a publisher
			if (cli.userinfo.roles.indexOf('advertiser') != -1) {
				cli.redirect(conf.default.server.url + "/advertiser", false);
				return true;
			} else {
				return false;
			}

		});
	}

	var registerRoles = function() {
		entities.registerRole({name : 'advertiser', displayname : 'Advertisement'}, ['dash', 'advertisement'], function() {
			return;
		}, true);
	}

	this.unregister = function(callback) {
		log("Advertiser", "Plugin disabled");
		endpoints.unregister('advertiser', 'GET');
		endpoints.unregister('advertiser', 'POST');

		callback();
	};

	this.register = function(_c, info, callback) {
		conf = _c;
		initRequires(_c.default.server.base);

		log("DitAllo", "Allo ici!");
		registerEndpoint();
		registerHooks();
		registerRoles();
		return callback();
	};
};

module.exports = new SayHi();
