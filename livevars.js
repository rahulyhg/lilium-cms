/*********************************************************************************************************
 *                                                                                                       *
 *  Live Variables | Non-cached data fetched from server async                                           *
 *                                                                                                       *
 *  Author : Erik Desjardins                                                                             *
 *  Contributors : Samuel Rondeau-Millaire                                                               *
 *  Description : Interprets LML and renders ready to be served HTML files                               *
 *  Documentation : http://liliumcms.com/docs                                                            *
 *                                                                                                       *
 *********************************************************************************************************
 *                                                                                                       *
 *-- Livevars Syntax ------------------------------------------------------------------------------------*
 *                                                                                                       *
 *      Tags start with an asterisk followed by the endpoint, then levels.                               *
 *      Labelled parameters can be added afterwards using JSON syntax, wrapped by parenthesis.           *
 *                                                                                                       *
 *      Example :                                                                                        *
 *        {*endpoint.secondlevel.thirdlevel(sontparam:"someValue",otherparam:"otherValue")}              *
 *                                                                                                       *
 *********************************************************************************************************/

var db = require('./includes/db.js');
var log = require('./log.js');
var pluginHelper = require('./pluginHelper.js');
var hooks = require('./hooks.js');

var RegisteredLiveVariables = new Object();

var LiveVariables = function() {
    var preparePackage = function(cli) {
        return {
            livevars: cli.livevars
        };
    };

    var createEndpoint = function(callback, rights) {
        return {
            callback: callback,
            rights: rights || new Array()
        };
    };

    var secondLevelVars = function(cli, params, next) {
        var keys = Object.keys(params);
        var keyIndex = 0;

        var nextVar = function() {
            if (keys.length < keyIndex) {
                var key = keys[keyIndex];
                var levels = params[key].toString().split('.');
                keyIndex++;

                if (typeof RegisteredLiveVariables[levels[0]] !== 'undefined') {
                    RegisteredLiveVariables[levels[0]].callback(cli, levels, params, function(val) {
                        params[key] = val;
                        nextVar();
                    });
                } else {
                    nextVar();
                }
            } else {
                next(params);
            }
        };
        nextVar();
    };

    var handleOneVar = function(cli, varObj, assoc, response, next) {
        var varName = varObj.varname;
        var params = varObj.params;
        var levels = varName.split('.');
        var topLevel = levels.shift();

        secondLevelVars(cli, params, function(params) {
            if (typeof RegisteredLiveVariables[topLevel] !== 'undefined') {
                var entityLib = require('./entities.js');
                var entity = cli.userinfo;

                if (entityLib.isAllowed(entity, RegisteredLiveVariables[topLevel].rights)) {
                    RegisteredLiveVariables[topLevel].callback(cli, levels, params, function(val) {
                        assoc[varName] = val;
                        next(true);
                    });
                } else {
                    response.code = 403;
                    response.valid = false;
                    response.message = "Unauthorized";

                    assoc[varName] = "[ACCESS DENIED FOR TOP LEVEL VARIABLE " + topLevel + "]";
                    next(false);
                }
            } else {
                response.code = 403;
                response.valid = false;
                response.message = "Unauthorized";

                assoc[varName] = '[UNREGISTERED TOP LEVEL LIVE VARIABLE ' + topLevel + ']';
                next(false);
            }
        });
    };

    var startLoop = function(cli, varNames, assoc, callback) {
        var index = 0;
        var max = varNames.length;
        var response = {
            code: 200,
            valid: true,
            message: "OK"
        };

        var checkLoop = function() {
            if (index >= max) {
                callback(response);
            } else {
                setTimeout(function() {
                    handleOneVar(cli, varNames[index], assoc, response, function(valid) {
                        index++;
                        checkLoop();
                    });
                }, 0);
            }
        };

        if (max > 0) {
            checkLoop();
        } else {
            callback(response);
        }
    };

    this.handleRequest = function(cli) {
        try {
            var liveVars = JSON.parse(cli.routeinfo.params.vars);
            cli.livevars = {};

            var callback = function(response) {
                cli.sendJSON({
                    livevars: cli.livevars,
                    response: response
                });
            };

            if (typeof liveVars === 'object') {
                startLoop(cli, liveVars, cli.livevars, callback);
            } else {
                callback();
            }
        } catch (e) {
            cli.throwHTTP(400, 'Bad request');
        }

    };

    this.registerDebugEndpoint = function() {
        log("Livevars", "Registering admin endpoint for debug");
        require('./backend/admin.js').registerAdminEndpoint('livevars', 'GET', function(cli) {
            cli.touch('livevars.GET');
            require('./filelogic.js').serveAdminLML(cli);
        });

        require('./formBuilder.js').createForm('debug_livevars', {
                fieldWrapper: {
                    tag: 'div',
                    cssPrefix: 'livevar-debug-field-'
                },
                cssClass: 'livevar-debug-form',
                dependencies: [],
                async: true
            })
            .add('endpoint', 'text', {
                displayname: "Endpoint",
            })
            .add('params', 'stack', {
                displayname: "Parameters",
                scheme: {
                    columns: [{
                        fieldName: 'paramname',
                        dataType: 'text',
                        displayname: "Name"
                    }, {
                        fieldName: 'paramvalue',
                        dataType: 'text',
                        displayname: "Value"
                    }]
                }
            })
            .add('submit', 'submit', {
                displayname: "Test"
            });
    };

    // Function must follow format : function(client, levels, params, callback)
    // Callback must be called, and must contain an array
    this.registerLiveVariable = function(endpoint, func, rights) {
        rights = rights || new Array();

        if (typeof RegisteredLiveVariables[endpoint] === 'undefined') {
            RegisteredLiveVariables[endpoint] = createEndpoint(func, rights);
            RegisteredLiveVariables[endpoint].pluginID = pluginHelper.getPluginIdentifierFromFilename(__caller, undefined, true);
        } else {
            log('LiveVariables', new Error("[LiveVariables] Tried to register an already defined endpoint : " + endpoint));
        }
    };

    deletePluginLivevars = function(identifier) {
        for (var i in RegisteredLiveVariables) {
            if (RegisteredLiveVariables[i].pluginID == identifier) {
                RegisteredLiveVariables[i] = undefined;
                delete RegisteredLiveVariables[i];
            }
        }
    };

    var loadHooks = function() {
        hooks.bind('plugindisabled', 1, function(identifier) {
            // Check if plugin created endpoints
            deletePluginLivevars(identifier);
        });
    };


    this.init = function() {
        loadHooks();
        return this;
    };
};

module.exports = new LiveVariables();
