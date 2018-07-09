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
        var index = -1;
        var max = varNames.length;
        var now = new Date().getTime();
        var response = {
            code: 200,
            valid: true,
            message: "OK"
        };

        var checkForCompletion = function() {
            if (++index == max) {
                response.timer = (new Date().getTime()) - now;
                callback(response);
            }
        };

        checkForCompletion();
        for (var i = 0; i < max; i++) {
            (function(i) {
                setTimeout(function() {
                    handleOneVar(cli, varNames[i], assoc, response, checkForCompletion);
                }, 0);
            })(i)
        }
    };

    this.handleRequest = function(cli) {
        if (cli.routeinfo.path[1] == "v4") {
            // LIVE VARIABLE V4
            RegisteredLiveVariables[cli.routeinfo.path[2]] ? RegisteredLiveVariables[cli.routeinfo.path[2]].callback(cli, cli.routeinfo.path.splice(2), cli.routeinfo.params, resp => {
                cli.sendJSON(resp);
            }) : cli.throwHTTP(404, undefined, true);
        } else {
            // LEGACY LIVE VARIABLE HANDLING LOGIC
            try {
                var liveVars = JSON.parse(cli.routeinfo.params.vars);
                cli.livevars = {};

                try {
                    cli.details = JSON.parse(cli.routeinfo.params.details || {});
                } catch (err) {
                    cli.details = {};
                }

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
                console.log(e);
                cli.throwHTTP(400, 'Bad request');
            }
        }
    };

    this.registerDebugEndpoint = function() {
        log("Livevars", "Registering admin endpoint for debug");

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

        if (!RegisteredLiveVariables[endpoint]) {
            RegisteredLiveVariables[endpoint] = createEndpoint(func, rights);
        } else {
            log('LiveVariables', new Error("[LiveVariables] Tried to register an already defined endpoint : " + endpoint));
        }
    
        // Possibility to chain
        return this;
    };

    this.apiGET = function(cli) {
        let variables = cli.routeinfo.params.v;
        const now = Date.now();

        const handleOne = (variable, send) => {
            const name = variable.varname;
            const levels = name.split('.');
            const toplevel = levels.shift();
            const params = variable.params || {};

            if (RegisteredLiveVariables[toplevel]) {
                RegisteredLiveVariables[toplevel].callback(cli, levels, params, val => {
                    send(val);
                });
            } else {
                send(404);
            }
        }

        if (!Array.isArray(variables)) {
            handleOne(variables, (val) => {
                if (typeof val == "object") {
                    cli.sendJSON(val);
                } else {
                    cli.sendText(val);
                }
            });
        } else {
            let index = -1;
            let output = {};

            const nextVar = () => {
                if (++index == variables.length) {
                    return finished();
                }

                handleOne(variables[index], (val) => {
                    output[variables[index].varname] = val;
                    nextVar();
                });
            };

            const finished = () => {
                cli.sendJSON(output);
            };

            nextVar();
        }
    };

    this.getAll = function() {
        return Object.freeze(RegisteredLiveVariables);
    };

    this.init = function() {
        return this;
    };
};

module.exports = new LiveVariables();
