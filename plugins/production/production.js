	 var log = undefined;
	 var endpoints = undefined;
	 var hooks = undefined;
	 var entities = undefined;
	 var conf = undefined;
	 var Admin = undefined;
	 var filelogic = undefined;
	 var formBuilder = undefined;
	 var sponsoredarticle = require('./sponsoredarticle.js');
	 var changerequest = require('./changeRequest.js');

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
	     sponsoredarticle.init(abspath);
	   };

	   var registerHooks = function() {
	     Admin.registerAdminEndpoint('production', 'GET', function(cli) {
	       cli.touch("admin.GET.production");
	       handleGET(cli);
	     });
	     Admin.registerAdminEndpoint('production', 'POST', function(cli) {
	       cli.touch("admin.POST.production");
	       handlePOST(cli);
	     });
	   };

	   var handleGET = function(cli) {
	     switch (cli.routeinfo.path[2]) {
	       case undefined:
	         filelogic.serveLmlPluginPage('production', cli, false);
	         break;
	       case 'changerequest':
	         changerequest.handleGET(cli);
	         break;
	       default:
	         cli.throwHTTP(404, 'Page not found');

	     }
	   }

	   var handlePOST = function(cli) {
	     switch (cli.routeinfo.path[2]) {
	       case 'sponsoredcontent':
	         sponsoredarticle.createSponsoredContent(cli);
	         break;
	       case 'changerequest':
	         changerequest.handlePOST(cli);
	         break;
	       default:
	         cli.throwHTTP(404, 'Page not found');

	     }
	   }

	   var registerRoles = function() {
	     entities.registerRole({
	       name: 'production',
	       displayname: 'Production'
	     }, ['dash', 'production', 'sponsoredcontent'], function() {
	       return;
	     }, true);
	   };

	   this.unregister = function(callback) {
	     log("Production", "Plugin disabled");

	     callback();
	   };

	   this.register = function(_c, info, callback) {
	     conf = _c;
	     initRequires(_c.default.server.base);
	     log("Production", "Initalizing plugin");
			 changerequest.init(_c.default.server.base);

	     registerHooks();

	     registerRoles();

	     return callback();
	   };
	 };

	 module.exports = new Production();
