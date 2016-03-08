var config = require('./config.js');
var log = require('./log.js');
var livevars = require('./livevars.js');
var fileserver = require('./fileserver.js');
var filelogic = require('./filelogic.js');

var _cachedSites = new Array();

var Sites = function() {
	this.registerLiveVar = function() {
		livevars.registerLiveVariable('sites', function(cli, levels, params, cb) {
			var len = levels.length;
			if (len == 0 || levels[0] == "simple") {
				cb(config.getSimpleSites());
			} else if (levels[0] == "complex") {
				cb(config.getAllSites());
			} else {
				cb();
			}
		});
	};

	this.handleGET = function(cli) {
		var param = cli.routeinfo.path[2];

		if (!param) {
			filelogic.serveAdminLML(cli);
		} else {
			cli.debug();
		}
	};

	this.cacheSitesFromDatabase = function(cb) {
		_cachedSites.push({displayName:"MTL Blog", name:"mtlblog"});
		_cachedSites.push({displayName:"Narcity Montreal", name:"narcitymtl"});
		_cachedSites.push({displayName:"Narcity Toronto", name:"narcityto"});

		cb();
	};

	this.loadSites = function(cb) {
		fileserver.listDirContent(__dirname + "/sites/", function(files) {
			var fileIndex = 0;
			var nextFile = function() {
				if (fileIndex == files.length) {
					cb();
				} else {
					var sitename = files[fileIndex].replace('.json', '');
					log('Sites', 'Loaded config for website ' + sitename);

					fileserver.readJSON(__dirname + "/sites/" + files[fileIndex], function(siteInfo) {
						config.registerConfigs(sitename, siteInfo);
						if (sitename == 'default') {
							var urlbase = siteInfo.server.url.replace('//', '');
							config.registerConfigs(urlbase, siteInfo);
						}

						fileIndex++;
						nextFile();
					});
				}
			};
			nextFile();
		});
	};
};

module.exports = new Sites();
