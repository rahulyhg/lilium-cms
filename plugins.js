var fs = require('fs');
var _c = require('./config.js');
var fileserver = require('./fileserver.js');
var filelogic = require('./filelogic.js');
var log = require('./log.js');
var Admin = require('./backend/admin.js');
var db = require('./includes/db.js');

var RegisteredPlugins = new Object();
var CachedPlugins = new Array();

var Plugins = function() {
	var that = this;

	this.serveAdminList = function(cli) {
		cli.touch("plugins.serveAdminList");
		filelogic.serveLmlPage(cli)
	};

	this.handlePOST = function(cli) {
		cli.touch("plugins.handlePOST");

		if (cli.routeinfo.path.length > 2) {
			switch (cli.routeinfo.path[2]) {
				case "registerPlugin":
					that.registerPlugin(cli.postdata.data.identifier, function() {
						cli.sendJSON({
							success: true
						});
					});
					break;
				case "unregisterPlugin":
					that.unregisterPlugin(cli.postdata.data.identifier, function() {
						cli.sendJSON({
							success: true
						});
					});
					break;
				default:

			}
		} else {
			filelogic.serveLmlPage(cli)
		}
	}

	this.getCachedPlugins = function(lmlContext) {
		return CachedPlugins;
	};

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
					CachedPlugins = allPlugins;
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

	this.getCachedPlugin = function (identifier) {
    for(var i = 0, len = CachedPlugins.length; i < len; i++) {
        if (CachedPlugins[i]['identifier'] === identifier) return CachedPlugins[i];
    }
    return null;
	}

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

				db.update('plugins', {identifier : identifier}, {identifier : identifier, active : true}, function() {
					pluginInstance.register(_c, info, callback);
				}, true, true);
			});
		}
	};

	this.unregisterPlugin = function(identifier, callback) {
		if (this.isRegistered(identifier)) {


			db.update('plugins', {identifier : identifier}, {identifier : identifier, active : false}, function() {
				RegisteredPlugins[identifier].unregister(callback);

				RegisteredPlugins[identifier] = undefined;
				delete RegisteredPlugins[identifier];

			}, true, true);

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

	this.bindEndpoints = function() {
		Admin.registerAdminEndpoint('plugins', 'GET', this.serveAdminList);
		Admin.registerAdminEndpoint('plugins', 'POST', this.handlePOST);
	};

	var init = function() {

	};

	init();
};

module.exports = new Plugins();
