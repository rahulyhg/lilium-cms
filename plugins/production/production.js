	 var log = undefined;
	 var endpoints = undefined;
	 var hooks = undefined;
	 var entities = undefined;
	 var conf = undefined;
	 var Admin = undefined;
	 var filelogic = undefined;
	 var formBuilder = undefined;

	 var Production = function() {
	   this.iface = new Object();

	   var initRequires = function(abspath) {
	     log = require(abspath + "log.js");
	     endpoints = require(abspath + "endpoints.js");
	     hooks = require(abspath + "hooks.js");
	     entities = require(abspath + "entities.js");
	     Admin = require(abspath + 'backend/admin.js');
	     filelogic = require(abspath + 'filelogic.js');
	     formBuilder = require(abspath + 'formBuilder.js');
	   };

	   var registerEndpoint = function() {

	     endpoints.register('production', 'GET', function(cli) {
	       cli.debug();
	     });
	   };

	   var registerHooks = function() {
	     Admin.registerAdminEndpoint('production', 'GET', function(cli){
	 			cli.touch("admin.GET.advertiser");
	 			adminAdvertiser.handleGET(cli);
	 		});
	     Admin.registerAdminEndpoint('production', 'POST', function(cli){
	 			cli.touch("admin.POST.advertiser");
	 			adminAdvertiser.handlePOST(cli);
	 		});
	   }

	   var registerRoles = function() {
	     entities.registerRole({
	       name: 'production',
	       displayname: 'Production'
	     }, ['dash', 'production', 'sponsoredcontent'], function() {
	       return;
	     }, true);
	   }

	   this.unregister = function(callback) {
	     log("Production", "Plugin disabled");

	     callback();
	   };

	   this.register = function(_c, info, callback) {
	     conf = _c;
	     initRequires(_c.default.server.base);
	     log("Production", "Initalizing plugin");

	     registerEndpoint();

	     registerHooks();

	     registerRoles();

	     return callback();
	   };
	 };

	 module.exports = new Production();
