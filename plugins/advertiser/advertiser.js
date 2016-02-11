	 var log = undefined;
	 var endpoints = undefined;
	 var hooks = undefined;
	 var entities = undefined;
	 var conf = undefined;
	 var Admin = undefined;
	 var filelogic = undefined;
	 var formBuilder = undefined;
	 var adminAdvertiser = require('./adminAdvertiser.js');

	 var Advertiser = function() {
	   this.iface = new Object();

	   var initRequires = function(abspath) {
	     log = require(abspath + "log.js");
	     endpoints = require(abspath + "endpoints.js");
	     hooks = require(abspath + "hooks.js");
	     entities = require(abspath + "entities.js");
	     Admin = require(abspath + 'backend/admin.js');
	     filelogic = require(abspath + 'filelogic.js');
	     formBuilder = require(abspath + 'formBuilder.js');

             adminAdvertiser.init(abspath);
	   };

	   var registerEndpoint = function() {

	     endpoints.register('advertiser', 'GET', function(cli) {
	       cli.debug();
	     });
	   };

	   var registerHooks = function() {
	     Admin.registerAdminEndpoint('advertiser', 'GET', function(cli){
	 			cli.touch("admin.GET.advertiser");
	 			adminAdvertiser.handleGET(cli);
	 		});
	     Admin.registerAdminEndpoint('advertiser', 'POST', function(cli){
	 			cli.touch("admin.POST.advertiser");
	 			adminAdvertiser.handlePOST(cli);
	 		});

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
	     entities.registerRole({
	       name: 'advertiser',
	       displayname: 'Advertisement'
	     }, ['dash', 'advertisement'], function() {
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
	     log("Advertiser", "Initalizing plugin");

             log('Advertiser', 'Registering Endpoints');
	     registerEndpoint();

             log('Advertiser', 'Hooking on events');
	     registerHooks();

             log('Advertiser', 'Adding advertiser role');
	     registerRoles();

	     return callback();
	   };
	 };

	 module.exports = new Advertiser();
