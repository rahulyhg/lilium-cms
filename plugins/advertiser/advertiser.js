	 var log = undefined;
	 var endpoints = undefined;
	 var hooks = undefined;
	 var entities = undefined;
	 var conf = undefined;
	 var Admin = undefined;
	 var filelogic = undefined;
	 var formBuilder = undefined;
	 var adminAdvertiser = require('./adminAdvertiser.js');
	 var campaigns = require('./campaigns.js');
	 var livevars = undefined;
	 var db = undefined;
	 var transaction = undefined;

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
	         livevars = require(abspath + 'livevars.js');
	         db = require(abspath + 'includes/db.js');
			 transaction = require(abspath + 'transaction.js');

	         campaigns.init(abspath);
	         adminAdvertiser.init(abspath);
	     };

	     var registerEndpoint = function() {

	         endpoints.register('advertiser', 'GET', function(cli) {
	             if (cli.isGranted('advertiser')) {

	                 switch (cli.routeinfo.path[1]) {
	                     case undefined:
	                         filelogic.serveLmlPluginPage('advertiser', cli, false);
	                         break;
	                     case 'campaigns':
	                         campaigns.handleGET(cli);
	                         break;
	                     default:
	                         cli.throwHTTP(404, 'Not found');


	                 }

	             } else {
	                 cli.redirect(conf.default.server.url + '/' + conf.default.paths.login, false);
	             }
	         });

			 endpoints.register('advertiser', 'POST', function(cli) {
				 if (cli.isGranted('advertiser')) {

					 switch (cli.routeinfo.path[1]) {
						 case undefined:
							 filelogic.serveLmlPluginPage('advertiser', cli, false);
							 break;
						 case 'campaigns':
							 campaigns.handlePOST(cli);
							 break;
						 default:
							 cli.throwHTTP(404, 'Not found');


					 }

				 } else {
					 cli.redirect(conf.default.server.url + '/' + conf.default.paths.login, false);
				 }
			 });
	     };

	     var registerHooks = function() {
	         Admin.registerAdminEndpoint('advertiser', 'GET', function(cli) {
	             cli.touch("admin.GET.advertiser");
	             adminAdvertiser.handleGET(cli);
	         });
	         Admin.registerAdminEndpoint('advertiser', 'POST', function(cli) {
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

	     var registerLiveVars = function() {
			 livevars.registerLiveVariable('isStripeClient', function(cli, levels, params, callback) {
				 campaigns.findStripeCostumer(cli, callback);
			 }, ["advertisement"]);

	         livevars.registerLiveVariable('advertiser', function(cli, levels, params, callback) {
	             var allEntities = levels.length === 0;
	             if (allEntities) {
	                 db.findToArray('entities', {
	                     roles: {
	                         $in: ['advertiser']
	                     }
	                 }, function(err, arr) {
	                     callback(err || arr);
	                 });
	             } else if (levels[0] == 'query') {
	                 var queryInfo = params.query || new Object();
	                 var qObj = new Object();

	                 qObj._id = queryInfo._id;
	                 qObj.displayname = queryInfo.displayname;
	                 qObj.email = queryInfo.email;
	                 qObj.roles = {
	                     $in: ['advertiser']
	                 }
	                 qObj.username = queryInfo.username;

	                 db.findToArray('entities', queryInfo, function(err, arr) {
	                     callback(err || arr);
	                 });
	             } else {
	                 db.multiLevelFind('entities', levels, {
	                     _id: db.mongoID(levels[0]),
	                     roles: {
	                         $in: ['advertiser']
	                     }
	                 }, {
	                     limit: [1]
	                 }, function(err, arr) {
	                     log('Advertiser Plugin', err);
	                     callback(err || arr);
	                 });
	             }
	         }, ["entities"]);

	     };

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
	         registerLiveVars();
	         return callback();
	     };
	 };

	 module.exports = new Advertiser();
