	 var log = undefined;
	 var endpoints = undefined;
	 var hooks = undefined;
	 var entities = undefined;
	 var conf = undefined;
	 var Admin = undefined;
	 var fileLogic = undefined;
	 var formBuilder = undefined;
	 var adminAdvertiser = require('./adminAdvertiser.js');
	 var campaigns = require('./campaignsAdvertiser.js');
	 var livevars = undefined;
	 var db = undefined;
	 var transaction = undefined;
	 var http = undefined;
     var dfp = require('./dfp.js');
     var production = require('./production.js');
     var backendsearch = undefined;
     var precomp = undefined;
     var Frontend = undefined;

    var noop = noOp = function() {};    

	var Advertiser = function() {
	    this.iface = new Object();

	     var initRequires = function(abspath) {
	         log = require(abspath + "log.js");
	         endpoints = require(abspath + "endpoints.js");
	         hooks = require(abspath + "hooks.js");
	         entities = require(abspath + "entities.js");
	         Admin = require(abspath + 'backend/admin.js');
	         fileLogic = require(abspath + 'filelogic.js');
             Frontend = require(abspath + 'frontend.js');

	         formBuilder = require(abspath + 'formBuilder.js');
	         livevars = require(abspath + 'livevars.js');
	         db = require(abspath + 'includes/db.js');
	         transaction = require(abspath + 'transaction.js');
             backendsearch = require(abspath + 'backend/search.js');
             precomp = require(abspath + "precomp.js");
	         http = require('http');

	         campaigns.init(abspath);
	         transaction.init();
	         adminAdvertiser.init(abspath);
    
             dfp.init(abspath, conf);
	     };

	     var registerEndpoint = function() {
	         endpoints.register('*', 'advertiser', 'GET', function(cli) {
	             cli.touch('advertiser.GET');
	             if (cli.isGranted('advertiser')) {
	                 switch (cli.routeinfo.path[1]) {
	                     case undefined:
	                         cli.touch('advertiser.GET.undefined');
	                         cli.routeinfo.relsitepath = "/advertiser";
	                         fileLogic.serveAdminLML(cli, false, new Object(), "plugins/advertiser/dynamic/adverttemplate.lml", "plugins/advertiser/dynamic");
	                         break;
	                     case 'campaigns':
	                         campaigns.handleGET(cli);
	                         break;
	                     default:
	                         cli.touch('advertiser.GET.404');
	                         cli.throwHTTP(404, 'Not found');
	                 }
	             } else {
	                 cli.redirect(conf.default().server.url + '/' + conf.default().paths.login, false);
	             }
	         });

	         endpoints.register('*', 'advertiser', 'POST', function(cli) {
	             if (cli.isGranted('advertiser')) {
	                 switch (cli.routeinfo.path[1]) {
	                     case undefined:
	                         cli.routeinfo.relsitepath = "/advertiser";
	                         fileLogic.serveAdminLML(cli, false, new Object(), "plugins/advertiser/dynamic/adverttemplate.lml", "plugins/advertiser/dynamic");
	                         break;
	                     case 'campaigns':
	                         campaigns.handlePOST(cli);
	                         break;
	                     default:
	                         cli.throwHTTP(404, 'Not found');
	                 }
	             } else {
	                 cli.redirect(conf.default().server.url + '/' + conf.default().paths.login, false);
	             }
	         });

             backendsearch.registerSearchFormat({
                 collection: "campaigns",
                 displayName : 'Campaigns', 
                 linkBase : "{adminurl}/campaigns/edit/{$}",
                 linkKey : "projectid"
             }, {
                 "projectid" : {displayName : "Project ID"},
                 "campname" : {displayName : "Campaign Name"}
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

	         hooks.bind('settings_form_bottom', 350, function(pkg) {
	             log('Advertiser', 'Adding fields to settings form');
	             pkg.form.add('ad-server-sep', 'title', {
	                     displayname: "Ad Server"
	                 })
	                 .add('adserver.publicaddr', 'text', {
	                     displayname: "Public Address with port (client requests)"
	                 }, {
	                     required: false
	                 })
	                 .add('adserver.privateaddr', 'text', {
	                     displayname: "Private Address with port (handshake)"
	                 }, {
	                     required: false
	                 })
	                 .add('adserver.bridgeaddr', 'text', {
	                     displayname: "Bridge Address with port (Lilium requests)"
	                 }, {
	                     required: false
	                 })
	                 .add('adserver.keyone', 'text', {
	                     displayname: "First Private key"
	                 }, {
	                     required: false
	                 })
	                 .add('adserver.keytwo', 'text', {
	                     displayname: "Second Private key"
	                 }, {
	                     required: false
	                 });


	             pkg.form.add('ad-taxes-sep', 'title', {
	                     displayname: "Sales Taxes"
	                 })
	                 .add('taxes', 'stack', {
	                     displayname: "Taxes",
	                     scheme: {
	                         columns: [{
	                             fieldName: 'region',
	                             dataType: 'text',
	                             displayname: "Region (Province or country)"
	                         }, {
	                             fieldName: 'percentage',
	                             dataType: 'number',
	                             displayname: "Percentage"
	                         }]
	                     }
	                 })
	         });

	         hooks.bind('user_loggedin', 350, function(cli) {
	             // Check if user is a publisher
	             if (cli.userinfo.roles.indexOf('advertiser') != -1) {
	                 cli.redirect(conf.default().server.url + "/advertiser", false);
	                 return true;
	             } else {
	                 return false;
	             }

	         });

	         hooks.bind('settings_will_save', 350, function(cli) {
	             var dat = cli._c;
	             var len = dat.adserver.privateaddr.length;
	             if (len != 0 && dat.adserver.privateaddr[len - 1] == '/') {
	                 dat.adserver.privateaddr = dat.adserver.privateaddr.substring(0, len - 1);
	             }

	             len = dat.adserver.publicaddr.length;
	             if (len != 0 && dat.adserver.publicaddr[len - 1] == '/') {
	                 dat.adserver.publicaddr = dat.adserver.publicaddr.substring(0, len - 1);
	             }
	         });

	         hooks.bind('settings_saved', 500, function() {
	             pingAdServer(function(valid) {
	                 log('Hooks', 'Setting saved event was caught with valid flag : ' + valid);
	             });
	         });

	         hooks.bind('campaignCreated', 560, function(pkg) {
                 var camp = pkg.camp;
	             makeAdServerRequest('newCampaign', camp.projectid, function(resp, err) {
	                 log("Advertiser", err ?
	                     "Error sending 'created' event : " + err :
	                     "AdServer responded to 'created' with code " + resp.statusCode
	                 );
	             }, camp.cli);
	         });

	         hooks.bind('campaignUpdated', 560, function(camp) {
	             makeAdServerRequest('updateCampaign', camp.new.projectid, function(resp, err) {
	                 log("Advertiser", err ?
	                     "Error sending 'updated' event : " + err :
	                     "AdServer responded to 'updated' with code " + resp.statusCode
	                 );
	             }, camp.cli);
	         });

	         hooks.bind('campaignStatusChanged', 560, function(camp) {
	             makeAdServerRequest('campaignStatusChanged', camp.new.projectid, function(resp, err) {
	                 log("Advertiser", err ?
	                     "Error sending 'statusChanged' event : " + err :
	                     "AdServer responded to 'statusChanged' with code " + resp.statusCode
	                 );
	             }, camp.cli);
	         });

	         hooks.bind('article_created', 1200, function(pkg) {
	             makeAdServerRequest('contentCreated', pkg.article._id.toString(), function(resp, err) {
	                 log("Advertiser", err ?
	                     "Error sending 'contentCreated' event : " + err :
	                     "AdServer responded to 'contentCreated' with code " + resp.statusCode
	                 );
	             }, pkg.cli);
	         });

	         hooks.bind('article_edited', 1200, function(pkg) {
	             makeAdServerRequest('contentEdited', pkg.article._id.toString(), function(resp, err) {
	                 log("Advertiser", err ?
	                     "Error sending 'contentEdited' event : " + err :
	                     "AdServer responded to 'contentEdtied' with code " + resp.statusCode
	                 );
	             }, pkg.cli);
	         });

            // Foreach site
            conf.eachSync(function(config) {
	             log('Advertiser', 'Registering Scripts and CSS');
	             var base = config.server.base;
                 var html = config.server.html;

	             log('Advertiser', 'Registered Scripts and CSS');
	             Frontend.registerCSSFile(config.server.base + "plugins/advertiser/dynamic/style.css", 3159, 'admin', config.id);
	             Frontend.registerCSSFile(base + "plugins/advertiser/dynamic/style.css", 5000, 'admin', config.id);
	             Frontend.registerJSFile(base + "plugins/advertiser/dynamic/stripe.js", 995, 'admin', config.id);
	             Frontend.registerCSSFile(html + "/compiled/lmlnaradserv.css", 6000, 'theme', config.id);
	             Frontend.registerJSFile (html + "/compiled/lmlnaradserv.js",  6000, 'theme', config.id);

                 log('Advertiser', "Queuing frontend scripts for compilation");
                 precomp.queueFile(config, base + "plugins/advertiser/dynamic/precomp/lmlnaradserv.js.lml" );
                 precomp.queueFile(config, base + "plugins/advertiser/dynamic/precomp/lmlnaradserv.css.lml");
            });
	     };

	     var createAdServerHandshake = function(cb) {
	         var cconf = conf.default();
	         var split = cconf.adserver.privateaddr.split(':');
	         var privAddr = split[0].replace(/\/\//g, '');
	         var privPort = split[1] || 5141;

	         var req = http.request({
	             host: privAddr,
	             port: privPort,
	             headers: {
	                 "x-lml-adkeyset": cconf.adserver.keyone,
	                 "x-lml-addoublelock": cconf.adserver.keytwo
	             }
	         }, function(response) {
	             cb(response);
	         });

	         req.on('error', function(err) {
	             log('Advertiser', "AdServer is unreachable : " + err);
	             cb(undefined, err);
	         });

	         req.end('', 'utf8');
	     };

	     var makeAdServerRequest = function(method, data, cb, cli, skipSecondTry) {
	         log('Adversiter', 'Sending POST to AdServer using method : ' + method);
	         var cconf = cli ? cli._c : conf.default();

	         if (!cconf) {
	             cb(undefined, new Error("Could not find client configuration"));
	             return;
	         }

	         if (!cconf.adserver && !cconf.adserver.bridgeaddr) {
	             cb(undefined, new Error("AdServer is not configured."));
	             return;
	         }

	         if (typeof data === 'undefined') {
	             cb(undefined, new Errpr("Cannot send undefined variable to AdServer"));
	         }


	         var split = cconf.adserver.bridgeaddr.split(':');
	         var privAddr = split[0].replace(/\/\//g, '');
	         var privPort = split[1] || 5142;

	         var confReq = http.request({
	             host: privAddr,
	             path: "/" + method,
	             port: privPort,
	             method: "POST"
	         }, function(confResp, err) {
	             if (!err && confResp.statusCode == 200) {
	                 log("Advertiser", "AdServer responded with OK flag");
	             } else {
	                 log("Advertiser", "AdServer responded with status code " + confResp.statusCode);
	             }

	             cb(confResp, err);
	         });

	         confReq.on('error', function(err) {
	             log("Advertiser", "Error handled while executing method '" + method + "' : " + err);
	             if (err.code == 'ECONNREFUSED' && !skipSecondTry) {
	                 log('Adversiter', 'Handshake was lost or not properly established. Retrying...');
	                 createAdServerHandshake(function(resp, err) {
	                     if (!err) {
	                         log('Advertiser', 'Sending command back to AdServer');
	                         makeAdServerRequest(method, data, cb, cli, true);
	                     }
	                 });
	             }

	             cb(undefined, err);
	         });

	         try {
	             confReq.write(
	                 typeof data == 'object' ?
	                 JSON.stringify(data) :
	                 '{"data":"' + data.toString().replace(/\"/g, '\\"') + '"}'
	             );

	             confReq.end();
	         } catch (ex) {
	             log('Advertiser', 'Exception caught while writing to AdServer : ' + ex);
	         }
	     };

	     var pingAdServer = function(cb) {
	         log("Advertiser", "Contacting AdServer");
	         var cconf = conf.default();

	         if (cconf.adserver && cconf.adserver.privateaddr) {
	             createAdServerHandshake(function(response, err) {
	                 if (!err && response.statusCode == 202) {
	                     log("Advertiser", "AdServer handshake was successfully created. Sending configs");
	                     makeAdServerRequest('setDatabaseConfig', {
	                         dba: cconf.data
	                     }, function(response, err) {
	                         cb(!err);
	                     });
	                 } else {
	                     log("Advertiser", "Could not create handshake with AdServer");
	                     cb(false);
	                 }
	             });
	         } else {
	             log("Adversiter", "AdServer is not configured yet.");
	             cb(false);
	         }
	     };

        var loadDFP = function () {
            log("DFP", "Loading core user");
            dfp.registerHooks();
            dfp.createUser();
            dfp.scheduleDeepCopy();

            setTimeout(function () {
                log('DFP', 'Running deep fetch async');
                dfp.deepServerFetch(function () {
                    log('DFP', 'Deep fetch finished');
                });
            }, 1);

            if (conf.default().env == 'dev') {
                dfp.createDevEnv();
            }
        };

	     var registerLiveVars = function() {
             dfp.registerLiveVar();

	         livevars.registerLiveVariable('isStripeClient', function(cli, levels, params, callback) {
	             campaigns.findStripeCostumer(cli, callback);
	         }, ["advertisement"]);

             livevars.registerLiveVariable('sponsoredcontent', function(cli, levels, params, callback) {
                var sentArr = new Array();
                db.findToArray(cli._c, 'content', {isSponsored:true}, function(err, arr) {  
                    for (var i = 0; i < arr.length; i++) {  
                        sentArr.push({ 
                            articleid: arr[i]._id,  
                            name: arr[i].name,
                            title: arr[i].title  
                        }); 
                    };  
                    
                    callback(sentArr);
                });
             });

	         livevars.registerLiveVariable('advertiser', function(cli, levels, params, callback) {
	             var allEntities = levels.length === 0;
	             if (allEntities) {
	                 db.findToArray(cli._c, 'entities', {
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

	                 db.findToArray(cli._c, 'entities', queryInfo, function(err, arr) {
	                     callback(err || arr);
	                 });
	             } else {
	                 db.multiLevelFind(cli._c, 'entities', levels, {
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
	             displayname: 'Advertiser',
                 power : 3000
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
	         try {
	             conf = _c;
	             initRequires(_c.default().server.base);
	             log("Advertiser", "Initalizing plugin", "lilium");

	             log('Advertiser', 'Registering Endpoints');
	             registerEndpoint();

	             log('Advertiser', 'Hooking on events');
	             registerHooks();

	             log('Advertiser', 'Adding advertiser role');
	             registerRoles();
	             registerLiveVars();

	             loadDFP();
             
                 pingAdServer(function() {
                     production.register(_c, info, callback);
                 });
	         } catch (e) {
	             console.log(e);
	         }
	     };
	 };

	 module.exports = new Advertiser();
