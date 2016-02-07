var log = require('./log.js');
var _c = require('./config.js');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var DFP = require('node-google-dfp');
var endpoints = require('./endpoints.js');
var Admin = require('./backend/admin.js');
var livevars = require('./livevars.js');

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

	this.createUser = function() {
		dfpUser = new DFP.User(_priv.network_code, _priv.app_name, _priv.version);
		dfpUser.setSettings(_priv);
	};

	this.registerLiveVar = function() {
		livevars.registerLiveVariable('dfp', this.livevarCallback);
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
