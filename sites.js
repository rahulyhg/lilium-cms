var _c = require('./config.js');
var log = require('./log.js');
var livevars = require('./livevars.js');

var _cachedSites = new Array();

var Sites = function() {
	this.registerLiveVar = function() {
		livevars.registerLiveVariable('sites', function(cli, levels, params, cb) {
			cb(_cachedSites);
		});
	};

	this.cacheSitesFromDatabase = function(cb) {
		_cachedSites.push({displayName:"MTL Blog", name:"mtlblog"});
		_cachedSites.push({displayName:"Narcity Montreal", name:"narcitymtl"});
		_cachedSites.push({displayName:"Narcity Toronto", name:"narcityto"});

		cb();
	};
};

module.exports = new Sites();
