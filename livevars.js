var db = require('./includes/db.js');

var RegisteredLiveVariables = {
	session : function(cli, levels, callback) {
		var dat = cli.request.session.data;
	
		for (var i = 0; i < levels.length; i++) {
			dat = dat[levels[i]];
		}

		callback(dat);
	},
	types : function(cli, levels, callback) {
		var allTypes = levels.length === 0;

		if (allTypes) {
			db.singleLevelFind('types', callback);
		} else {
			db.multiLevelFind('types', levels, {name:levels[0]}, {}, callback);
		}
	},
	entities : function(cli, levels, callback) {
		var allEntities = levels.length === 0;

		if (allEntities) {
			db.singleLevelFind('entities', callback);
		} else {	
			db.multiLevelFind('entities', levels, {username:levels[0]}, {limit:[1]}, callback);
		}
	},
	content : function(cli, levels, callback) {
		var allContent = levels.length === 0;

		if (allContent) {
			db.singleLevelFind('content', callback);
		} else {
			db.multiLevelFind('content', levels, {contentid:levels[0]}, {limit:[1]}, callback);
		}
	},
	sites : function(cli, levels, callback) {
		var allContent = levels.length === 0;

		if (allContent) {
			db.singleLevelFind('sites', callback); 
		} else {
			db.multiLevelFind('content', levels, {siteid:levels[0]}, {limit:[1]}, callback);
		}
	},
	vocab : function(cli, levels, callback) {
		var wholeDico = levels.length === 0;

		if (wholeDico) {
			db.singleLevelFind('vocab', callback);
		} else {
			db.multiLevelFind('vocab', levels, {langcode:levels[0]}, {limit:[1]}, callback);
		}
	}
};

var LiveVariables = function() {
	var preparePackage = function(cli) {
		return {livevars : cli.livevars};
	};

	var handleOneVar = function(cli, varName, assoc, next) {
		var levels = varName.split('.');
		var topLevel = levels.shift();

		if (typeof RegisteredLiveVariables[topLevel] !== 'undefined') {
			RegisteredLiveVariables[topLevel](cli, levels, function(val) {
				assoc[varName] = val;
				next(true);
			});
		} else {
			assoc[varName] = '[UNREGISTERED TOP LEVEL LIVE VARIABLE '+toplevel+']';
			next(false);
		}
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
		var liveVars = cli.routeinfo.params.vars;
		cli.livevars = {};

		var callback = function() {
			cli.sendJSON(cli.livevars);
		};

		if (typeof liveVars === 'object') {
			startLoop(cli, liveVars, cli.livevars, callback);
		} else if (typeof liveVars === 'string') {
			startLoop(cli, [liveVars], cli.livevars, callback);
		} else {
			callback();
		}
	};

	// Function must follow format : function(client, endpoint, callback)
	// Callback must contain the good value
	this.registerLiveVariable = function(endpoint, func) {
		if (typeof RegisteredLiveVariables[endpoint] === 'undefined') {
			RegisteredLiveVariables[endpoint] = func();
		} else {
			throw "[LiveVariables] Tried to register an already defined endpoint : " + endpoint;
		}
	};

	var init = function() {

	};

	init();
};

module.exports = new LiveVariables();


