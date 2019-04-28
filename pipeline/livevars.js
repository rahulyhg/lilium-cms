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

const hooks = require('../lib/hooks');
const metrics = require('../lib/metrics');
const RegisteredLiveVariables = {}; 

class LiveVariables {
    createEndpoint(callback, rights) {
        return {
            callback: callback,
            rights: rights || [] 
        };
    };

    secondLevelVars(cli, params, next) {
        const keys = Object.keys(params);
        let keyIndex = 0;

        const nextVar = () =>  {
            if (keys.length < keyIndex) {
                const key = keys[keyIndex];
                const levels = params[key].toString().split('.');
                keyIndex++;

                if (typeof RegisteredLiveVariables[levels[0]] !== 'undefined') {
                    RegisteredLiveVariables[levels[0]].callback(cli, levels, params, (val) =>  {
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

    handleOneVar(cli, varObj, assoc, response, next) {
        const varName = varObj.varname;
        const params = varObj.params;
        const levels = varName.split('.');
        const topLevel = levels.shift();

        this.secondLevelVars(cli, params, (params) =>  {
            if (typeof RegisteredLiveVariables[topLevel] !== 'undefined') {
                const entityLib = require('../lib/entities.js');
                const entity = cli.userinfo;

                if (entityLib.isAllowed(entity, RegisteredLiveVariables[topLevel].rights)) {
                    RegisteredLiveVariables[topLevel].callback(cli, levels, params, (val) =>  {
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

    startLoop(cli, varNames, assoc, callback) {
        let index = -1;
        let max = varNames.length;
        let now = new Date().getTime();
        const response = {
            code: 200,
            valid: true,
            message: "OK"
        };

        const checkForCompletion = () =>  {
            if (++index == max) {
                response.timer = (new Date().getTime()) - now;
                callback(response);
            }
        };

        checkForCompletion();
        for (let i = 0; i < max; i++) {
            this.handleOneVar(cli, varNames[i], assoc, response, checkForCompletion);
        }
    };

    handleRequest(cli) {
        metrics.plusDeep('endpointsreq', "livevar/" + cli.routeinfo.path[2]);
        hooks.fireSite(cli._c, 'livevar_handled', cli);

        if (cli.routeinfo.path[1] == "v4") {
            // LIVE VARIABLE V4
            let params = cli.routeinfo.params || {};

            try {
                RegisteredLiveVariables[cli.routeinfo.path[2]] ? RegisteredLiveVariables[cli.routeinfo.path[2]].callback(
                    cli, cli.routeinfo.path.splice(3), params, 
                resp => {
                    cli.sendJSON(resp);
                }) : cli.throwHTTP(404, undefined, true);
            } catch (err) {
                log('Livevar', 'Live variable request crashed', 'err');
                cli.crash(err);
            }
        } else {
            // LEGACY LIVE VARIABLE HANDLING LOGIC
            try {
                const liveVars = JSON.parse(cli.routeinfo.params.vars);
                cli.livevars = {};

                try {
                    cli.details = JSON.parse(cli.routeinfo.params.details || {});
                } catch (err) {
                    cli.details = {};
                }

                const callback = (response) =>  {
                    cli.sendJSON({
                        livevars: cli.livevars,
                        response: response
                    });
                };

                if (typeof liveVars === 'object') {
                    this.startLoop(cli, liveVars, cli.livevars, callback);
                } else {
                    callback();
                }
            } catch (e) {
                console.log(e);
                cli.throwHTTP(400, 'Bad request');
            }
        }
    };

    registerDebugEndpoint() {

    };

    // Function must follow format : (client, levels, params, callback) => 
    // Callback must be called, and must contain an array
    registerLiveVariable(endpoint, func, rights = []) {
        metrics.setDeep('endpointsreq', "livevar/" + endpoint, 0);
        log('LiveVariables', 'Registering livevar endpoint : ' + endpoint, 'info');
        if (!RegisteredLiveVariables[endpoint]) {
            RegisteredLiveVariables[endpoint] = this.createEndpoint(func, rights);
        } else {
            log('LiveVariables', new Error("[LiveVariables] Tried to register an already defined endpoint : " + endpoint));
        }
    
        // Possibility to chain
        return this;
    };

    getAll() {
        return Object.freeze(RegisteredLiveVariables);
    };

    init() {
        return this;
    };
};

module.exports = new LiveVariables();
