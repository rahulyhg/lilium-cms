var fs = require('fs');
var _c = require('./config.js');
var fileserver = require('./fileserver.js');
var log = require('./log.js');

var RegisteredPlugins = new Object(); 

var Plugins = function() {
	this.searchDirForPlugin = function(identifier, callback) {
		this.getPluginsDirList(function(list) {
			var pluginInfo = undefined;

			for (var i = 0; i < list.length; i++) {
				if (list[i].identifier == identifier) {
					pluginInfo = list[i];
					break;
				}
			}

			callback(pluginInfo);
		});
	};

	this.getPluginsDirList = function(callback) {	
		var plugindir = _c.default.server.base + _c.default.paths.plugins + "/";

		fs.readdir(plugindir, function(err, dirs) {
			if (err) {
				throw "[PluginException] Could not access plugin directory : " + err;
			}
			
			var allPlugins = new Array();

			var i = -1;
			nextDir = function() {
				i++;
				if (i >= dirs.length) {
					callback(allPlugins);
				} else {
					var infoPath = plugindir + dirs[i] + "/" + _c.default.paths.pluginsInfo;
					fileserver.fileExists(infoPath, function(exists) {
						if (exists) {
							fileserver.readJSON(infoPath, function(json) {
								json.dirName = dirs[i];
								allPlugins.push(json);
								nextDir();
							});
						} else {
							nextDir();
						}
					});
				}
			};
	
			nextDir();
		});
	};

	this.isRegistered = function(identifier) {
		return typeof RegisteredPlugins[identifier] !== 'undefined';
	};
	
	this.registerPlugin = function(identifier, callback) {
		var that = this;
		if (this.isRegistered(identifier)) {
			throw "[PluginException] Cannot register already registered plugin with identifier " + identifier;
		} else {
			log('Plugins', 'Registering plugin with identifier ' + identifier);
			this.searchDirForPlugin(identifier, function(info) {
				if (!info) {
					throw "[PluginException] Could not find any info on plugin with identifier " + identifier;
				}

				var plugindir = _c.default.server.base + _c.default.paths.plugins + "/";
				var pluginInstance = require(plugindir + info.dirName + "/" + info.entry);

				RegisteredPlugins[identifier] = pluginInstance;
				pluginInstance.register(_c, info, callback);
			});
		}
	};

	this.unregisterPlugin = function(identifier) {
		if (this.isRegistered(identifier)) {
			this.getIface(identifier).unregister();

			RegisteredPlugins[identifier] = undefined;	
			delete RegisteredPlugins[identifier];	
		} else {
			throw "[PluginException] Cannot unregister unregistered plugin with identifier " + identifier;
		}
	};

	this.getIface = function(identifier) {
		if (this.isRegistered(identifier)) {
			if (typeof RegisteredPlugins[identifier].iface === 'object') {
				return RegisteredPlugins[identifier].iface;
			} else {
				throw "[PluginException] Plugin with identifier " + identifier + " has no public iface";
			}
		} else {
			throw "[PluginException] Could not get public iface of unregistered plugin with identifier " + identifier;
		}
	};

	var init = function() {

	};

	init();
};

module.exports = new Plugins();
