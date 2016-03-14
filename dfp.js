var log = require('./log.js');
var _c = require('./config.js');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var DFP = require('node-google-dfp');
var endpoints = require('./endpoints.js');
var Admin = require('./backend/admin.js');
var livevars = require('./livevars.js');
var db = require('./includes/db.js');
var scheduler = require('./scheduler.js');
var hooks = require('./hooks');

var _priv = {
	client_id : "906088923998-mlch13qpsds3cg92kd2ue6prhdhle84n.apps.googleusercontent.com",
	client_secret : "nIuS1lRrl02_JIAtLAJ9EElM",
	redirect_url : "http://localhost:8080",
	scope : "https://www.googleapis.com/auth/dfp",
	code : "4/EHagw-cFLeez04pjAhjubD-LrG2EP_NmILuKHIML40Q",
	access_token : "ya29.fQK4I9i2ywVFZ0aHjo4k9mhs8IPysHSeXpwFLyDRTpvnx94SAzxmgFq3zpKFtB9r_tEs",
	refresh_token : "1/2Kxb7a6acNGFoHl6zNtEGZe-iWIEzBPNSkDvrsf_uFZIgOrJDtdun6zK6XiATCKT",
	version : "v201511",
	network_code : "1020360",
	app_name : "Lilium CMS"
};

var _priv = _c.default().dfp || {};	

/*
var oauth2Client = new OAuth2(_priv.client_id, _priv.client_secret, _priv.redirect_url);
google.options({ auth: oauth2Client });

oauth2Client.setCredentials({
	access_token: _priv.access_token,
 	refresh_token: _priv.refresh_token
});



var url = oauth2Client.generateAuthUrl({
	access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token) 
	scope: _priv.scope
});


console.log(url);

oauth2Client.getToken(_priv.code, function(err, tokens) {
	// Now tokens contains an access_token and an optional refresh_token. Save them. 
	if(!err) {
    		oauth2Client.setCredentials(tokens);
    		console.log(JSON.stringify(tokens));
	} else {
    		console.log(err);
  	}
});
*/

var dfpUser = undefined;

// Salut : https://github.com/ShinyAds/node-google-dfp/ 
var LiliumDFP = function() {
	that = this;

	this.handleDebug = function(cli) {
		require('./filelogic.js').serveLmlPage(cli);
	};

	// Format : dfp.service.action (statement:DFPStatement)
	// IG : {*dfp.OrderService.getOrdersByStatement(statement:"WHERE status = 'DRAFT' OR status = 'APPROVED'",template:"dfpList")}
	this.livevarCallback = function(cli, levels, params, cb) {
		if (levels.length == 0 || typeof levels[0] !== 'string') {
			cb("[DFPLiveVarException] Must contain a valid service as second level");
			return;
		} else if (levels.length == 1 || typeof levels[1] !== 'string') {
			cb("[DFPLiveVarException] Must contain a valid action as third level");
			return;
		} else if (typeof params.statement === 'undefined') {
			cb("[DFPLiveVarException] Must contain a valid params 'statement' with a DQL Statement");
			return;
		}

		var serviceName = levels[0];
		var actionName = levels[1];
		dfpUser.getService(serviceName, function(err, dfpService) {
			if (err) {
				cb("[DFPLiveVarException] Error encountered while getting service " + serviceName + " : " + err);
				return;
			} else if (typeof dfpService[actionName] !== 'function') {
				cb("[DFPLiveVarException] Invalid action " + actionName + " for service " + serviceName);
				return;
			}
			
			var statement = new DFP.Statement(params.statement);

			dfpService[actionName].apply(dfpService, [statement, function(err, results) {
				if (err) {
					cb("[DFPLiveVarException] Error encountered in service callback : " + err);
					return;
				}

				cb(results.rval.results);
			}]);
		});
	};

	this.cachedLivevarCallback = function(cli, levels, params, cb) {
		var actionName = levels[0];
		var complexity = levels[1] || "complete";
		if (!actionName) {
			cb("[DFPCachedLiveVarException] No root actions are defined for this live variable");
		} else {
			if (actionName == "all") {
				if (complexity == 'simple') {
					db.find(cli._c, 'dfpcache', {}, {}, function(err, cur) {
						var bigArr = new Array();
						var nextObject = function() {
							cur.hasNext(function(err, hasNext) {
								if (!err && hasNext) {
									cur.next(function(err, obj) {
										bigArr.push({
											id : obj.id,
											name : obj.name
										});
										nextObject();
									});
								} else {
									cb(bigArr);
								}
							});
						};
						nextObject();
					});
				} else if (complexity == 'complete') {
					db.findToArray(cli._c, 'dfpcache', {}, function(err, arr) {
						cb(err || arr);
					});
				} else {
					cb("[DFPCachedLiveVarException] Complexity '" + complexity + "' does not exist for action 'all'");
				}
			} else if (actionName == "some") {
				var limit = params.limit;
				if (!limit) {
					
				} else {
					cb("[DFPCachedLiveVarException] Action 'some' requires a number as the 'limit' parameter");
				}
			} else {
				cb("[DFPCachedLiveVarException] No live variable action called " + actionName);
			}
		}
	};

	this.deepServerFetch = function(callback) {
		if (_priv.client_id) {
			log('DFP', 'Preparing for deep orders copy');
			dfpUser.getService('LineItemService', function(err, ser) {
				ser.getLineItemsByStatement(new DFP.Statement('WHERE 1 = 1'), function(err, results) {
					var arr = results.rval.results;
	
					log('DFP', 'Running database queries');
					db.remove(_c.default(), 'dfpcache', {}, function() {
						db.insert(_c.default(), 'dfpcache', arr, function() {
							log('DFP', 'Stored deep copy of '+arr.length+' DFP Orders');
							if (callback) {
								callback();
							}
						});
					});
				});
			});
		}
	};

	this.scheduleDeepCopy = function() {
		var that = this;
		log('DFP', "Scheduled Deep Copy");
		scheduler.schedule('dfpDeepCopy', {
			runat : "3:00:00"
		}, function() {
			log('DFP', "Starting scheduled deep fetch");
			that.deepServerFetch(function() {
				log('DFP', "Ended scheduled deep fetch");
			});
		});
	};

	this.createUser = function() {
		if (_priv.client_id) {
			dfpUser = new DFP.User(_priv.network_code, _priv.app_name, _priv.version);
 			dfpUser.setSettings(_priv);
		}
	};

	this.registerHooks = function() {
		log('DFP', 'Binding Setting form event');
		hooks.bind('settings_form_bottom', 117, function(pkg) {
			var form = pkg.form;
			form.add('dfp_title', 'title', {displayname:"DFP"})
			.add('dfp.client_id', 'text', {displayname:"Client ID"}, {required:false})
			.add('dfp.client_secret', 'text', {displayname:"Client Secret"}, {required:false})
			.add('dfp.redirect_url', 'text', {displayname:"Redirect URL"}, {required:false})
			.add('dfp.scope', 'text', {displayname:"Scope"}, {required:false})
			.add('dfp.code', 'text', {displayname:"Code"}, {required:false})
			.add('dfp.access_token', 'text', {displayname:"Access Token"}, {required:false})
			.add('dfp.refresh_token', 'text', {displayname:"Refresh Token"}, {required:false})
			.add('dfp.version', 'text', {displayname:"API Version"}, {required:false})
			.add('dfp.network_code', 'text', {displayname:"Network Code"}, {required:false})
			.add('dfp.app_name', 'text', {displayname:"DFP App Name"}, {required:false})

			log('DFP', 'Added fields to Settings form');
		});
	};

	this.registerLiveVar = function() {
		livevars.registerLiveVariable('dfp', this.livevarCallback);
		livevars.registerLiveVariable('dfpcache', this.cachedLivevarCallback);
		log('DFP', 'Registered DFP live variable endpoint as "dfp.service.action"');
	};

	this.createDevEnv = function() {
		Admin.registerAdminEndpoint('debugDFP', 'GET', function(cli) {
			that.handleDebug(cli);
		});
		log('DFP', 'Registered Debug endpoint at admin/debugDFP');
	};
};

module.exports = new LiliumDFP();
