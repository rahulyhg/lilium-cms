var fs = require('fs');
var _c = require('./config.js');
var fileserver = require('./fileserver.js');
var filelogic = require('./filelogic.js');
var log = require('./log.js');
var Admin = require('./backend/admin.js');
var db = require('./includes/db.js');
var livevars = require('./livevars.js');

var RegisteredPlugins = new Object();
var CachedPlugins = new Array();

var Plugins = function() {
	var that = this;

	this.serveAdminList = function(cli) {
		cli.touch("plugins.serveAdminList");
		filelogic.serveAdminLML(cli)
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
			filelogic.serveAdminLML(cli)
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
		var plugindir = _c.default().server.base + _c.default().paths.plugins + "/";

		fs.readdir(plugindir, function(err, dirs) {
			if (err) {
				throw new Error("[PluginException] Could not access plugin directory : " + err);
			}

			var allPlugins = new Array();

			var i = -1;
			nextDir = function() {
				i++;
				if (i >= dirs.length) {
					CachedPlugins = allPlugins;
					callback(allPlugins);
				} else {
					var infoPath = plugindir + dirs[i] + "/" + _c.default().paths.pluginsInfo;
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
			throw new Error("[PluginException] Cannot register already registered plugin with identifier " + identifier);
		} else {
			log('Plugins', 'Registering plugin with identifier ' + identifier);
			that.searchDirForPlugin(identifier, function(info) {
				if (!info) {	
					log("PluginException", "Could not find any info on plugin with identifier " + identifier);
					throw new Error("[PluginException] Could not find any info on plugin with identifier " + identifier);
				}

				try {
					var plugindir = _c.default().server.base + _c.default().paths.plugins + "/";
					var pluginInstance = require(plugindir + info.dirName + "/" + info.entry);
	
					RegisteredPlugins[identifier] = pluginInstance;
	
					db.update(_c.default(), 'plugins', {identifier : identifier}, {identifier : identifier, active : true}, function() {
						if (typeof pluginInstance.register !== 'function') {
							log("Plugins", 'Plugin has no method "register"');
							callback();
						} else {
							log('Plugins', "Calling register method on plugin with identifier " + identifier);
							pluginInstance.register(_c, info, function(){
								return callback();
							});
 						}
 					}, true, true);
				} catch (ex) {
					log("Plugins", "Could not register plugin [" + identifier + "] because of an exception : " + ex);
					console.log(ex.stack);
				}
			});
		}
	};

	this.unregisterPlugin = function(identifier, callback) {
		if (this.isRegistered(identifier)) {


			db.update(_c.default(), 'plugins', {identifier : identifier}, {identifier : identifier, active : false}, function() {
				RegisteredPlugins[identifier].unregister(function(){
					RegisteredPlugins[identifier] = undefined;
					delete RegisteredPlugins[identifier];
					return callback();
				});



			}, true, true);

		} else {
			throw new Error("[PluginException] Cannot unregister unregistered plugin with identifier " + identifier);
		}
	};

	this.getIface = function(identifier) {
		if (this.isRegistered(identifier)) {
			if (typeof RegisteredPlugins[identifier].iface === 'object') {
				return RegisteredPlugins[identifier].iface;
			} else {
				throw new Error("[PluginException] Plugin with identifier " + identifier + " has no public iface");
			}
		} else {
			throw new Error("[PluginException] Could not get public iface of unregistered plugin with identifier " + identifier);
		}
	};

	this.bindEndpoints = function() {
		Admin.registerAdminEndpoint('plugins', 'GET', this.serveAdminList);
		Admin.registerAdminEndpoint('plugins', 'POST', this.handlePOST);
	};

	this.registerLiveVar = function() {
		livevars.registerLiveVariable("plugin", function(cli, levels, params, callback) {
			var allPlugins = levels.length === 0;

			if (allPlugins) {
				db.singleLevelFind(_c.default(), 'plugins', callback);
			} else {
				db.multiLevelFind(_c.default(), 'plugins', levels, {identifier:(levels[0])}, {limit:[1]}, callback);
			}
		}, ['plugins']);
	};

	var init = function() {

	};

	init();
};

module.exports = new Plugins();
