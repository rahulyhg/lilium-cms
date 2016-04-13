var pluginHelper = require('./pluginHelper.js');
var hooks = require('./hooks.js');

var registeredEndpoints = {
    GET: {},
    POST: {}
};

var EndPoints = function () {
    this.register = function (endpoint, method, callback) {
        if (typeof registeredEndpoints[method][endpoint] !== 'undefined') {
            throw new Error("[EndPointException - Already registered : " + method + "/" + endpoint + "]");
        }

        registeredEndpoints[method][endpoint] = callback;
        registeredEndpoints[method][endpoint].pluginID = pluginHelper.getPluginIdentifierFromFilename(__caller, undefined, true);

    };

    this.unregister = function (endpoint, method) {
        if (typeof registeredEndpoints[method][endpoint] !== 'undefined') {
            delete registeredEndpoints[method][endpoint];
        }
    };

    this.isRegistered = function (endpoint, method) {
        return typeof registeredEndpoints[method][endpoint] !== 'undefined';
    };

    this.execute = function (endpoint, method, cli) {
        if (typeof registeredEndpoints[method][endpoint] !== 'undefined') {
            registeredEndpoints[method][endpoint](cli);
        } else {
            throw new Error("[EndPointException - Not Found : " + method + "/" + endpoint + "]");
        }
    };

    var loadHooks = function () {
        hooks.bind('plugindisabled', 1, function(identifier) {
            // Check if plugin created endpoints
            deletePluginEndpoints(identifier);
        });
    };

    var deletePluginEndpoints = function (identifier) {
        for (var i in registeredEndpoints) {
            for (var j in registeredEndpoints[i]) {
                if (registeredEndpoints[i][j].pluginID == identifier) {
                    registeredEndpoints[i][j] = undefined;
                    delete registeredEndpoints[i][j];
                }
            }
        }
    };

    this.init = function() {
        loadHooks();
    };
};

module.exports = new EndPoints();
