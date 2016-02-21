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

var RegisteredLiveVariables = new Object();;

var LiveVariables = function() {
	var preparePackage = function(cli) {
		return {livevars : cli.livevars};
	};

	var createEndpoint = function(callback, rights) {
		return {
			callback : callback,
			rights : rights || new Array()
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

	var handleOneVar = function(cli, varObj, assoc, next) {
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
					assoc[varName] = "[ACCESS DENIED FOR TOP LEVEL VARIABLE "+topLevel+"]";
					next(false);
				}
			} else {
				assoc[varName] = '[UNREGISTERED TOP LEVEL LIVE VARIABLE '+topLevel+']';
				next(false);
			}
		});
	};

	var startLoop = function(cli, varNames, assoc, callback) {
		var index = 0;
		var max = varNames.length;

		var checkLoop = function() {
			if (index >= max) {
				callback();
			} else {
				setTimeout(function() {
					handleOneVar(cli, varNames[index], assoc, function() {
						index++;
						checkLoop();
					});
				}, 0);
			}
		};

		if (max > 0) {
			checkLoop();
		} else {
			callback();
		}
	};

	this.handleRequest = function(cli) {
		try{
			var liveVars = JSON.parse(cli.routeinfo.params.vars);
			cli.livevars = {};

			var callback = function() {
				cli.sendJSON(cli.livevars);
			};

			if (typeof liveVars === 'object') {
				startLoop(cli, liveVars, cli.livevars, callback);
			} else {
				callback();
			}
		} catch(e) {
			cli.throwHTTP(400, 'Bad request');
		}

	};

	// Function must follow format : function(client, levels, params, callback)
	// Callback must be called, and must contain an array
	this.registerLiveVariable = function(endpoint, func, rights) {
		rights = rights || new Array();

		if (typeof RegisteredLiveVariables[endpoint] === 'undefined') {
			RegisteredLiveVariables[endpoint] = createEndpoint(func, rights);
		} else {
			throw new Error("[LiveVariables] Tried to register an already defined endpoint : " + endpoint);
		}
	};

	var init = function() {

	};

	init();
};

module.exports = new LiveVariables();
