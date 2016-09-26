var log = undefined;
var _c = undefined;
var google = undefined;
var OAuth2 = undefined;
var DFP = undefined;
var endpoints =undefined;
var Admin = undefined;
var livevars = undefined;
var db = undefined;
var scheduler = undefined;
var hooks = undefined;

var _priv = {
    client_id: "906088923998-mlch13qpsds3cg92kd2ue6prhdhle84n.apps.googleusercontent.com",
    client_secret: "nIuS1lRrl02_JIAtLAJ9EElM",
    redirect_url: "http://localhost:8080",
    scope: "https://www.googleapis.com/auth/dfp",
    code: "4/EHagw-cFLeez04pjAhjubD-LrG2EP_NmILuKHIML40Q",
    access_token: "ya29.fQK4I9i2ywVFZ0aHjo4k9mhs8IPysHSeXpwFLyDRTpvnx94SAzxmgFq3zpKFtB9r_tEs",
    refresh_token: "1/2Kxb7a6acNGFoHl6zNtEGZe-iWIEzBPNSkDvrsf_uFZIgOrJDtdun6zK6XiATCKT",
    version: "v201511",
    network_code: "1020360",
    app_name: "Lilium CMS"
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
var LiliumDFP = function () {
    that = this;

    this.handleDebug = function (cli) {
        require('./filelogic.js').serveLmlPage(cli);
    };

    // Format : dfp.service.action (statement:DFPStatement)
    // IG : {*dfp.OrderService.getOrdersByStatement(statement:"WHERE status = 'DRAFT' OR status = 'APPROVED'",template:"dfpList")}
    this.livevarCallback = function (cli, levels, params, cb) {
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
        dfpUser.getService(serviceName, function (err, dfpService) {
            if (err) {
                cb("[DFPLiveVarException] Error encountered while getting service " + serviceName + " : " + err);
                return;
            } else if (typeof dfpService[actionName] !== 'function') {
                cb("[DFPLiveVarException] Invalid action " + actionName + " for service " + serviceName);
                return;
            }

            var statement = new DFP.Statement(params.statement);

            dfpService[actionName].apply(dfpService, [statement, function (err, results) {
                if (err) {
                    cb("[DFPLiveVarException] Error encountered in service callback : " + err);
                    return;
                }

                cb(results.rval.results);
            }]);
        });
    };

    this.cachedLivevarCallback = function (cli, levels, params, cb) {
        var actionName = levels[0];
        var complexity = levels[1] || "complete";
        if (!actionName) {
            cb("[DFPCachedLiveVarException] No root actions are defined for this live variable");
        } else {
            if (actionName == "all") {
                if (complexity == 'simple') {
                    db.find(cli._c, 'dfpcache', {}, [], function (err, cur) {
                        cur.project({id : 1, name : 1, _id : 0}).toArray(function(err, arr) {
                            cb(err || arr);
                        });
                    });
                } else if (complexity == 'complete') {
                    db.findToArray(cli._c, 'dfpcache', {}, function (err, arr) {
                        cb(err || arr);
                    });
                } else {
                    cb("[DFPCachedLiveVarException] Complexity '" + complexity + "' does not exist for action 'all'");
                }
            } else if (!isNaN(actionName)) {
                var limit = parseInt(actionName);

                db.rawCollection(cli._c, "dfpcache", {}, function(err, col) {
                    var cur = col.find().sort([["id", -1]]).limit(limit);
                    if (complexity === "simple") {
                        cur = cur.project({id : 1, name : 1, _id : 0});
                    }
                    cur.toArray(function(err, arr) {
                        if (err) {
                            cb("[DFPCacheLiveVarException] " + err);
                            return;
                        }

                        cb(arr);
                    });
                })
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

    this.deepServerFetch = function (callback) {
        setTimeout(function() {
            if (_priv.client_id) {
                log('DFP', 'Preparing for deep orders copy');
                dfpUser.getService('LineItemService', function (err, ser) {
                    if (err) {
                        log('DFP', "Could not deep fetch : " + err);
                        if (callback) callback();
                        return;
                    }
                  
                    var deepFetchNow = new Date(); 
                    log('DFP', "Getting line items"); 
                    ser.getLineItemsByStatement(new DFP.Statement(""), function (err, results) {
                        if (err) {
                            log('DFP', "Error getting line items : " + err);
                            if (callback) callback(err);
                            return;
                        }

                        var arr = results.rval.results;
                        var dMs = Math.floor(((new Date() - deepFetchNow) / 1000));
                        var dMin = Math.floor(dMs / 60);
                        var dSec = dMs % 60;

                        log('DFP', 
                            'Got ' + arr.length + 
                            ' line items from DFP servers in ' + dMin + ':' + dSec 
                        );
 
                        log('DFP', 'Running database queries');
                        db.remove(_c.default(), 'dfpcache', {}, function (err) {
                            var index = 0;
                            var jumps = 1000;
                            var insertNext = function() {
                                var sliced = arr.slice(index, index + jumps);

                                if (sliced.length != 0) {                                
                                    sliced = sliced.filter(function(item) {
                                        return item.name && 
                                            item.name.toLowerCase().indexOf("index") !== 0 && 
                                            item.name.indexOf('Dummy') !== 0;
                                    });

                                    if (sliced.length != 0) {
                                        db.insert(_c.default(), 'dfpcache', sliced, function () {
                                            log('DFP', 'Stored deep copy block ' + (index + sliced.length) + ' / ' + arr.length);
                                            index += jumps;
    
                                            setTimeout(insertNext, 5);
                                        });
                                    } else {
                                        log("DFP", "Skipped entire block for containing only Index Exchange items");
                                        index += jumps;
                                        insertNext();
                                    }
                                } else {
                                    log('DFP', 'Finished storing deep copy of ' + arr.length + ' DFP Orders');
                                    if (callback) callback();
                                }
                            };
                            setTimeout(insertNext, 1);
                        });
                    });
                });
            }
        }, 1);
    };

    this.scheduleDeepCopy = function () {
        var that = this;
        log('DFP', "Scheduled Deep Copy");
        scheduler.schedule('dfpDeepCopy', {
            runat: "3:00:00"
        }, function () {
            log('DFP', "Starting scheduled deep fetch");
            that.deepServerFetch(function () {
                log('DFP', "Ended scheduled deep fetch");
            });
        });
    };

    this.createUser = function () {
        if (_priv.client_id) {
            dfpUser = new DFP.User(_priv.network_code, _priv.app_name, _priv.version);
            dfpUser.setSettings(_priv);
        }
    };

    this.registerHooks = function () {};

    this.registerLiveVar = function () {
        livevars.registerLiveVariable('dfp', this.livevarCallback);
        livevars.registerLiveVariable('dfpcache', this.cachedLivevarCallback);
        log('DFP', 'Registered DFP live variable endpoint as "dfp.service.action"');
    };

    this.createDevEnv = function () {
        Admin.registerAdminEndpoint('debugDFP', 'GET', function (cli) {
            that.handleDebug(cli);
        });
        log('DFP', 'Registered Debug endpoint at admin/debugDFP');
    };

    this.init = function(abspath, conf) {
        log = require(abspath + 'log.js');
        _c = require(abspath + 'config.js');
        google = require('googleapis');
        OAuth2 = google.auth.OAuth2;
        DFP = require('node-google-dfp');
        endpoints = require(abspath + 'endpoints.js');
        Admin = require(abspath + 'backend/admin.js');
        livevars = require(abspath + 'livevars.js');
        db = require(abspath + 'includes/db.js');
        scheduler = require(abspath + 'scheduler.js');
        hooks = require(abspath + 'hooks');

        _priv = conf.default().dfp || _priv;
    }
};

module.exports = new LiliumDFP();
