var pluginHelper = require('./pluginHelper.js');
var hooks = require('./hooks.js');
var config = require('./config.js'); 
var log = require('./log.js');

// Schema : {SITE_ID:{METHOD:{ENDPOINT:{ENDPOINTDATA}}}}
var registeredEndpoints = new Object();
var contextualEndpoints = new Object();

var AllowedMethods = function() {
    this.GET  = new Object();
    this.POST = new Object();
};

var EndPoints = function () {
    this.list = function() {
        var dump = [];
        for (var site in registeredEndpoints) {
            for (var method in registeredEndpoints[site]) {
                for (var endpoint in registeredEndpoints[site][method]) {
                    dump.push(method + "  " + site + "/" + endpoint);
                }
            }
        }

        return dump;
    }

    this.register = function (site, endpoint, method, callback) {
        if (typeof endpoint == "object" && endpoint.length) {
            for (var i = 0; i < endpoint.length; i++) {
                this.register(site, endpoint[i], method, callback);
            }

            return;
        }        

        log('Endpoint', "Registering endpoint " + method + "@" + endpoint + " for website with id " + site, 'info');
        if (site && site != '*') {
            if (typeof registeredEndpoints[site][method][endpoint] !== 'undefined') {
                return new Error("[EndPointException - Already registered : " + method + "/" + endpoint + "]");
            }

            registeredEndpoints[site][method][endpoint] = callback;
            registeredEndpoints[site][method][endpoint].pluginID = pluginHelper.getPluginIdentifierFromFilename(__caller, undefined, true);
        } else if (site == '*') {
            config.eachSync(function(config) {
                var site = config.id;
                if (typeof registeredEndpoints[site][method][endpoint] !== 'undefined') {
                    return new Error("[EndPointException - Already registered : " + method + "/" + endpoint + "]");
                }

                registeredEndpoints[site][method][endpoint] = callback;
                registeredEndpoints[site][method][endpoint].pluginID = false;
            });
        }
    };

    this.registerContextual = function(site, endpoint, method, callback) {
        contextualEndpoints[site][method][endpoint] = callback;
    };

    this.executeContextual = function(endpoint, method, cli, extra) {
        var ed = contextualEndpoints[cli._c.id][method][endpoint];
        ed && ed(cli, extra);
    };

    this.contextualIsRegistered = function(site, endpoint, method) {
        return !!contextualEndpoints[site][method][endpoint];
    };

    this.unregister = function (site, endpoint, method) {
        if (typeof registeredEndpoints[site][method][endpoint] !== 'undefined') {
            delete registeredEndpoints[site][method][endpoint];
        }
    };

    this.isRegistered = function (site, endpoint, method) {
        return registeredEndpoints[site] && typeof registeredEndpoints[site][method][endpoint] !== 'undefined';
    };

    this.execute = function (endpoint, method, cli) {
        var site = cli.routeinfo.configname;
        if (typeof registeredEndpoints[site][method][endpoint] !== 'undefined') {
            registeredEndpoints[site][method][endpoint](cli);
        } else {
            throw new Error("[EndPointException - Not Found : " + method + "/" + endpoint + "]");
        }
    };

    this.addSite = function(site) {
        if (typeof registeredEndpoints[site] === 'undefined') {
            registeredEndpoints[site] = new AllowedMethods();
            contextualEndpoints[site] = new AllowedMethods();
        } else {
            log("Endpoint", "Tried to add existing site " + site);
            return new Error("[EndPointException - Tried to add existing site " + site + "]");
        }
    };

    var loadHooks = function () {
        hooks.bind('plugindisabled', 2, function(identifier) {
            deletePluginEndpoints(identifier);
        });
    };

    var deletePluginEndpoints = function (identifier) {
        config.eachSync(function(siteinfo) {
            var regEnd = registeredEndpoints[siteinfo.id];
            for (var i in regEnd) {
                for (var j in regEnd[i]) {
                    if (regEnd[i][j].pluginID == identifier) {
                        delete regEnd[i][j];
                    }
                }
            }
        });
    };

    this.init = function() {
        loadHooks();
    };
};

module.exports = new EndPoints();
