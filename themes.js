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
	var that = this;

	this.serveAdminList = function(cli) {
		cli.touch("themes.serveAdminList");
		if (cli.routeinfo.path.length > 2 && cli.routeinfo.path[2] == "enableTheme") {
			that.enableTheme(cli.postdata.data.uName, function() {
				cli.sendJSON({
					success: true
				});
			});
		} else {
			filelogic.serveLmlPage(cli);
		}

	};

	this.getCachedThemes = function() {
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
					callback(allThemes)
				} else {
					var infoPath = themedir + dirs[i] + "/" + _c.default.paths.themesInfo;
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
					console.log(ActiveTheme);
					db.update('themes', {uName : ActiveTheme.uName}, {active: false});
				}

				ActiveTheme = ThemeInstance;

				ActiveTheme.active = true;
				ActiveTheme.uName = uName;

				db.update('themes', {uName : uName}, ActiveTheme, function() {

					ThemeInstance.enable(_c, info, callback);
				}, true, true);

			});
		}
	};


	this.bindEndpoints = function() {
		Admin.registerAdminEndpoint('themes', 'GET', this.serveAdminList);
		Admin.registerAdminEndpoint('themes', 'POST', this.serveAdminList);
	};

	var init = function() {

	};

	init();

};

module.exports = new Themes();
