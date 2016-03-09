var _configs = new Object();
var log = require('./log.js');

var Config = function() {
	this.httpRegex = /https?\:\/\//;
};

Config.prototype.getAllSites = function() {
	var arr = new Array();

	for (var key in _configs) if (key != 'default') {
		arr.push(_configs[key]);
	}

	return arr;
};

Config.prototype.getSimpleSites = function() {
	var arr = new Array();

	for (var key in _configs) if (key != 'default') {
		arr.push({
			displayName : _configs[key].website.sitetitle,
			name : key
		});
	}

	return arr;
};

Config.prototype.fetchConfig = function(site) {
	return _configs[site];
}

Config.prototype.fetchConfigFromCli = function(cli) {
	var rootdomain = cli.request.headers.host.replace(this.httpRegex, "") + cli.request.url;

	while (rootdomain && !_configs.hasOwnProperty(rootdomain)) {
		var index = rootdomain.lastIndexOf('/');
		rootdomain = index == -1 ? undefined : rootdomain.substring(0, index);
	}
	cli.routeinfo.configname = rootdomain;
	cli.routeinfo.rootdomain = rootdomain;
	cli._c = _configs[rootdomain];
};

Config.prototype.default = function() {
	return _configs.default;
};

Config.prototype.eachSync = function(callback) {
	for (var site in _configs) {
		if (site != 'default') callback(_configs[site]);
	}
};

Config.prototype.each = function(loopFtc, end) {
	var sites = Object.keys(_configs);
	var siteIndex = 0;

	var nextItem = function() {
		if (siteIndex == sites.length) {
			end();
		} else if (sites[siteIndex] == 'default') {
			siteIndex++;
			nextItem();
		} else {
			loopFtc(_configs[sites[siteIndex]], function() {
				siteIndex++;
				nextItem();
			});
		}
	};
	nextItem();
};

Config.prototype.registerConfigs = function(key, object) {
	_configs[key] = object;

	log('Config', 'Registered config with key ' + key);
	if (key == "default") {
		object.default = true;
	}
};

module.exports = new Config();
