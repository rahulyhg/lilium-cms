var fs = require('fs');
var _c = require('./config.js');
var fileserver = require('./fileserver.js');
var filelogic = require('./filelogic.js');
var log = require('./log.js');
var Admin = require('./backend/admin.js');
var db = require('./includes/db.js');

var ActiveTheme = new Object();
var CachedThemes = new Array();

var Themes = function() {
	this.serveAdminList = function(cli) {
		cli.touch("themes.serveAdminList");
		if (cli.routeinfo.path.length > 2 && cli.routeinfo.path[2] == "enableTheme") {
			this.enableTheme(function() {
				cli.sendJSON({
					activeTheme: ActiveTheme
				});
			});
		} else {
			filelogic.serveLmlPage(cli);
		}

	};

	this.getCachedThemes = function(lmlContext) {
		return CachedThemes;
	};

	this.searchDirForThemes = function(uName, callback) {
		this.getThemesDirList(function(list) {
			var themeInfo = undefined;

			for (var i = 0; i < list.length; i++) {
				if (list[i].uName == uName) {
					themeInfo = list[i];
					break;
				}
			}
			callback(themeInfo);
		});
	};

	this.getThemesDirList = function(callback) {
		var themedir = _c.default.server.base + _c.default.paths.themes + "/";
		fs.readdir(themedir, function(err, dirs) {
			if (err) {
				throw "[ThemeException] Could not access theme directory : " + err;
			}

			var allThemes = new Array();

			var i = -1;
			nextDir = function() {
				i++;
				if (i >= dirs.length) {
					CachedThemes = allThemes;
					callback(allThemes);
				} else {
					var infoPath = themedir + dirs[i] + "/" + _c.default.paths.themesInfo;
          console.log(infoPath);
					fileserver.fileExists(infoPath, function(exists) {
						if (exists) {
							fileserver.readJSON(infoPath, function(json) {
								json.dirName = dirs[i];
								allThemes.push(json);
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

  this.isActive = function(uName) {
		return ActiveTheme.uName == uName;
	};

	this.enableTheme = function(uName, callback) {
		var that = this;
		if (this.isActive(uName)) {
			throw "[ThemeException] Cannot register already registered theme with uName " + uName;
		} else {
			log('Themes', 'Registering theme with uName ' + uName);
			this.searchDirForThemes(uName, function(info) {
				if (!info) {
					throw "[ThemeException] Could not find any info on theme with uName " + uName;
				}

				var themedir = _c.default.server.base + _c.default.paths.themes + "/";
				var ThemeInstance = require(themedir + info.dirName + "/" + info.entry);

				if (typeof ActiveTheme !== 'undefined') {
					db.update('themes', {uName : uName}, {active: false});
				}

				ActiveTheme = ThemeInstance;
				ActiveTheme.active = true;

				db.update('themes', {uName : uName}, ActiveTheme, function() {
					ThemeInstance.enable(_c, info, callback);
				}, true, true);

			});
		}
	};

	var activateNewTheme = function () {

	}

	this.unregisterPlugin = function(identifier) {
		if (this.isRegistered(identifier)) {
			this.getIface(identifier).unregister();

			RegisteredPlugins[identifier] = undefined;
			delete RegisteredPlugins[identifier];
		} else {
			throw "[ThemeException] Cannot unregister unregistered plugin with uName " + uName;
		}
	};

	this.bindEndpoints = function() {
		Admin.registerAdminEndpoint('themes', 'GET', this.serveAdminList);
	};

	var init = function() {

	};

	init();
};

module.exports = new Themes();
