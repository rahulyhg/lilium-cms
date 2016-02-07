var _c = require('./config.js');
var hooks = require('./hooks.js');
var endpoints = require('./endpoints.js');
var plugins = require('./plugins.js');
var LML = require('./lml.js');
var log = require('./log.js');
var LoginLib = require('./backend/login.js');
var db = require('./includes/db.js');
var fs = require('fs');
var fileserver = require('./fileserver.js');
var cli = require('./cli.js');
var admin = require('./backend/admin.js');
var Article = require('./article.js');
var Media = require('./media.js');
var imageSize = require('./imageSize.js');
var themes = require('./themes.js');
var entities = require('./entities.js');
var cacheInvalidator = require('./cacheInvalidator.js');
var dfp = require('./dfp.js');
var postman = require('./postman.js');
var Products = require('./products');
var Campaigns = require('./campaigns.js');
var Frontend = require('./frontend.js');

var Core = function() {
	var loadHooks = function(readyToRock) {
		log('Hooks', 'Loading hooks');
		hooks.bind('init', readyToRock);

		hooks.fire('hooks');
		log('Hooks', 'Loaded hooks');
	};

	var loadEndpoints = function() {
		log('Endpoints', 'Loading endpoints');
		endpoints.register('login', 'POST', function(cli) {
			cli.touch("endpoints.POST.login");
			LoginLib.authUser(cli);
		});

		endpoints.register('admin', 'POST', function(cli) {
			cli.touch("endpoints.POST.admin");
			admin.handleAdminEndpoint(cli);
		});

		admin.registerAdminEndpoint('article', 'GET', function(cli){
			cli.touch("admin.GET.article");
			Article.handleGET(cli);
		});
	
		admin.registerAdminEndpoint('entities', 'GET', function(cli){
			cli.touch("admin.GET.entities");
			entities.handleGET(cli);
		});

		admin.registerAdminEndpoint('entities', 'POST', function(cli){
			cli.touch("admin.POST.entities");
			entities.handlePOST(cli);
		});

		admin.registerAdminEndpoint('article', 'POST', function(cli){
			cli.touch("admin.POST.article");
			Article.handlePOST(cli);
		});

		admin.registerAdminEndpoint('media', 'GET', function(cli){
			cli.touch("admin.GET.media");
			Media.handleGET(cli);
		});

		admin.registerAdminEndpoint('media', 'POST', function(cli){
			cli.touch("admin.POST.media");
			Media.handlePOST(cli);
		});

		admin.registerAdminEndpoint('campaigns', 'GET', function(cli) {
			cli.touch('admin.GET.campaigns');
			Campaigns.handleGET(cli);
		});

		hooks.fire('endpoints');
		log('Endpoints', 'Loaded endpoints');
	};

	/**
	 * Calls a function based on the path of the cli
	 * @param  {ClientObject} cli    the ClientObject
	 * @param  {class} _class the class where you want to call the function
	 */
	var callFunction = function(cli, _class) {
		if (typeof _class[cli.routeinfo.path[1]] ==
			 'function' && typeof cli.routeinfo.path[2] !==
			 'undefined') {
				 _class[cli.routeinfo.path[1]](cli, cli.routeinfo.path[2]);
		}
		if (typeof _class[cli.routeinfo.path[1]] == 'function') {
			_class[cli.routeinfo.path[1]](cli);
		}else {
			cli.throwHTTP(404, 'Page not found.');
		}
	}

	var loadImageSizes = function() {
		imageSize.add("thumbnail", 150, '150');
		imageSize.add("medium", 300, '*');
		imageSize.add("Archive-thumbnail", 400, 400);
	}

	var loadPlugins = function(cb) {
		log('Plugins', 'Loading plugins');

		plugins.bindEndpoints();

		var fireEvent = function() {
			log('Plugins', 'Loaded plugins');
			return cb();
		};

		db.findToArray('plugins', {"active":true}, function(err, results) {
			if (err) {
				log('Plugins', 'Failed to find entries in database; ' + err);
				fireEvent();

				return;
			}

			log('Plugins', 'Read plugins collection in database');
			var i = -1;
			var nextObject = function() {
				i++
				if (i != results.length) {
					plugins.registerPlugin(results[i].identifier, nextObject);
				} else {
					fireEvent();
				}
			};

			if (results.length > 0) {
				nextObject();
			} else {
				plugins.getPluginsDirList(function(){
					log('Plugins', 'Nothing to register');
					fireEvent();
				});

			}
		});

	};

	var loadRoles = function(cb) {
		entities.cacheRoles(cb);
	};

	var loadProducts = function(cb) {
		db.findToArray('products', {}, function(err, arr) {
			for (var i = 0; i < arr.length; i++) {
				Products.registerProduct(arr[i]);
			}

			db.findToArray('producttypes', {}, function(err, arr) {	
				for (var i = 0; i < arr.length; i++) {
					Products.registerProductType(arr[i].name, arr[i].displayName);
				}

				db.findToArray('productpricebases', {}, function(err, arr) {
					for (var i = 0; i < arr.length; i++) {
						Products.registerPriceBase(arr[i].name, arr[i].displayName, arr[i].divider);
					}

					log('Products', 'Loaded products info from database');
					cb();
				});
			});
		});
	};

	var loadTheme = function() {
		log('Themes', 'Loading Theme');
		themes.bindEndpoints();

		var fireEvent = function() {
			log('Themes', 'Loaded Themes');
			hooks.fire('themes');
		};

		db.find('themes', {"active":true}, {limit:[1]}, function(err, cursor) {
			if (err) {
				log('Themes', 'Failed to find entries in database; ' + err);
				fireEvent();

				return;
			}

			log('Themes', 'Read themes collection in database');
			var i = 0;

			cursor.each(function(err, theme) {
				if (theme != null) {
					i++;
					themes.enableTheme(theme.uName, function() {
						fireEvent();
					});
				} else {

					if (i == 0){
						// Enable with default theme
						themes.enableTheme(_c.default.website.flower, function() {
							fireEvent();
						});
					};
					cursor.close();
				}
			});
		});

	}

	var testDatabase = function(callback) {
		log('Database', 'Testing database');
		var dbinit = function() {
			log('Database', 'Initializing database if not initialized');
			db.initDatabase(function(err) {
				log('Database', 'Firing Database init signal');
				hooks.fire('dbinit', err);
			});
		};

		var dbconn = function() {
			log ('Database', 'Requesting dynamic connection object');
			db.createPool(function() {
				log('Database', 'Firing Database connection signal');
				hooks.fire('dbconn');
			});
		};

		hooks.bind('dbtest', function(err) {
			log('Database', 'Received Database test signal : ' + (err?'failed':'success'));
			dbinit();
		});

		hooks.bind('dbinit', function(err) {
			log('Database', 'Received Database init signal');
			dbconn();
		});

		hooks.bind('dbconn', function(err) {
			log('Database', 'Received Database connection signal');
			callback();
		});

		db.testConnection(function(err) {
			hooks.fire('dbtest', err);
		});
	};

	var loadStaticSymlink = function(callback) {
		log('FileServer', 'Creating symlink for static files.');
		hooks.bind('staticsymlink', function(err) {
			if (err) {
				log('Core', 'Could not create symlink : ' + err);
			}

			callback();
		});

		var to = _c.default.server.html + '/static';
		var rootDir = _c.default.server.base + 'backend/static/';
		cli.createSymlink(rootDir, to);

		to =   _c.default.server.html + '/bower';
		rootDir = _c.default.server.base + 'bower_components/';
		cli.createSymlink(rootDir, to);

		to =   _c.default.server.html + '/uploads';
		rootDir = _c.default.server.base + 'backend/static/uploads/';
		cli.createSymlink(rootDir, to);
		hooks.fire('staticsymlink', undefined);

	};

	var loadStandardInput = function() {
		var stdin = process.openStdin();
		stdin.liliumBuffer = "";
		stdin.on('data', function(chunk) {
			setTimeout(function() {
				chunk = chunk.toString().trim();
				stdin.liliumBuffer += chunk;

				if (chunk === '') {
					eval(
						'try{'+
						stdin.liliumBuffer+
						'}catch(ex){log'+
						'("STDin", "Error : " + ex)}'
					);
					stdin.liliumBuffer = "";
				}
			}, 0);
		});

		log("STDin", 'Listening to standard input');
	};

	var loadCacheInvalidator = function() {
		if (_c.default.env == 'dev') {
			log("CacheInvalidator", 'Clearing old cached files in db');

			db.remove('cachedFiles', {}, function() {}, false);
		}
		log("CacheInvalidator", 'Initializing cacheInvalidator');
		cacheInvalidator.init(function () {
			log("CacheInvalidator", 'Ready to invalidate cached files!');
		});
	}

	var loadHTMLStructure = function(callback) {
		fileserver.createDirIfNotExists(_c.default.server.html, function(valid) {
			if (valid) {
				log('FileServer',
					'HTML Directory was validated at : ' +
					_c.default.server.html
				);
			} else {
				log('FileServer', 'Error validated html directory');
			}

		}, true);
		loadStaticSymlink(callback);
	};

	var loadLiveVars = function() {
		// Article.registerContentLiveVar();
		Media.registerMediaLiveVar();
		dfp.registerLiveVar();
		Campaigns.registerLiveVar();
		entities.registerLiveVars();
	};

	var loadPostman = function() {
		postman.createTransporter();
	};

	var loadDFP = function(cb) {
		log("DFP", "Loading core user");
		dfp.createUser();

		if (_c.default.env == 'dev') {
			dfp.createDevEnv();
		}
	};

	var loadForms = function() {
		Campaigns.registerCreationForm();
		entities.registerCreationForm();
		LoginLib.registerLoginForm();
	};

	var loadFrontend = function() {
		Frontend.registerFromCore();
	};

	this.makeEverythingSuperAwesome = function(readyToRock) {
		log('Core', 'Initializing Lilium');
		loadHooks(readyToRock);
		loadEndpoints();
		loadStandardInput();
		loadImageSizes();
		loadForms();
		loadPostman();
		loadLiveVars();
		loadDFP();
		loadFrontend();

		hooks.bind('themes', function() {
			log('Core', 'Firing initialized signal');
			hooks.fire('init', {
				loaded : [
					"hooks", "endpoints","plugins", "themes"
				]
			});
		});

		loadHTMLStructure(function() {
			testDatabase(function() {
				loadPlugins(function(){
					loadRoles(function() {
						loadProducts(function() {
							loadCacheInvalidator();
							loadTheme();
						});
					});
				});
			});
		});
	};

	var init = function() {
		log('Core', 'Lilium core object was created');
	};

	init();
};

module.exports = new Core();
