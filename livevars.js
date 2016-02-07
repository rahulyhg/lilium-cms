var db = require('./includes/db.js');
var mongo = require('mongodb');
var log = require('./log.js');

var RegisteredLiveVariables = {

	session : function(cli, levels, params, callback) {
		var dat = cli.request.session.data;

		for (var i = 0; i < levels.length; i++) {
			dat = dat[levels[i]];
		}

		callback(dat);
	},

	types : function(cli, levels, params, callback) {
		var allTypes = levels.length === 0;

		if (allTypes) {
			db.singleLevelFind('types', callback);
		} else {
			db.multiLevelFind('types', levels, {name:levels[0]}, {}, callback);
		}
	},

	content : function(cli, levels, params, callback) {
		var allContent = levels.length === 0;

		if (allContent) {
			db.singleLevelFind('content', callback);
		} else {
			db.multiLevelFind('content', levels, {_id : new mongo.ObjectID(levels[0])}, {limit:[1]}, callback);
		}
	},
	sites : function(cli, levels, params, callback) {
		var allContent = levels.length === 0;

		if (allContent) {
			db.singleLevelFind('sites', callback);
		} else {
			db.multiLevelFind('content', levels, {siteid:levels[0]}, {limit:[1]}, callback);
		}
	},
	vocab : function(cli, levels, params, callback) {
		var wholeDico = levels.length === 0;

		if (wholeDico) {
			db.singleLevelFind('vocab', callback);
		} else {
			db.multiLevelFind('vocab', levels, {langcode:levels[0]}, {limit:[1]}, callback);
		}
	},

	uploads : function(cli, levels, params, callback) {
		var allMedia = levels.length === 0;

		if (allMedia) {
			db.singleLevelFind('uploads', callback);
		} else {
			db.multiLevelFind('uploads', levels, {_id:new mongo.ObjectID(levels[0])}, {limit:[1]}, callback);
		}
	},

	theme : function(cli, levels, params, callback) {
		var allThemes = levels.length === 0;

		if (allThemes) {
			db.singleLevelFind('themes', callback);
		} else {
			db.multiLevelFind('themes', levels, {uName:(levels[0])}, {limit:[1]}, callback);
		}
	}
};

var LiveVariables = function() {
	var preparePackage = function(cli) {
		return {livevars : cli.livevars};
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
					RegisteredLiveVariables[levels[0]](cli, levels, params, function(val) {
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
				RegisteredLiveVariables[topLevel](cli, levels, params, function(val) {
					assoc[varName] = val;
					next(true);
				});
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
	};

	// Function must follow format : function(client, levels, params, callback)
	// Callback must be called, and must contain an array
	this.registerLiveVariable = function(endpoint, func) {
		if (typeof RegisteredLiveVariables[endpoint] === 'undefined') {
			RegisteredLiveVariables[endpoint] = func;
		} else {
			throw "[LiveVariables] Tried to register an already defined endpoint : " + endpoint;
		}
	};

	var init = function() {

	};

	init();
};

module.exports = new LiveVariables();
