var _c = undefined;
var settings = undefined;
var hooks = undefined;
var endpoints = undefined;
var plugins = undefined;
var LML = undefined;
var LoginLib = undefined;
var db = undefined;
var fs = undefined;
var fileserver = undefined;
var cli = undefined;
var admin = undefined;
var Article = undefined;
var Media = undefined;
var imageSize = undefined;
var themes = undefined;
var entities = undefined;
var cacheInvalidator = undefined;
var dfp = undefined;
var postman = undefined;
var Products = undefined;
var Campaigns = undefined;
var Frontend = undefined;
var notification = undefined;
var Forms = undefined;
var sessions = undefined;
var sites = undefined;
var Handler = undefined;
var ClientObject = undefined;
var Inbound = undefined;
var Livevars = undefined;
var Precompiler = undefined;
var Petals = undefined;
var GC = undefined;
var scheduler = undefined;
var Role = undefined;

var log = require('./log.js');

var Core = function() {
	var loadRequires = function() {
		_c = require('./config.js');
		settings = require('./settings.js');
		hooks = require('./hooks.js');
		endpoints = require('./endpoints.js');
		plugins = require('./plugins.js');
		LML = require('./lml.js');
		LoginLib = require('./backend/login.js');
		db = require('./includes/db.js');
		fs = require('fs');
		fileserver = require('./fileserver.js');
		cli = require('./cli.js');
		admin = require('./backend/admin.js');
		Article = require('./article.js');
		Media = require('./media.js');
		imageSize = require('./imageSize.js');
		themes = require('./themes.js');
		entities = require('./entities.js');
		cacheInvalidator = require('./cacheInvalidator.js');
		dfp = require('./dfp.js');
		postman = require('./postman.js');
		Products = require('./products');
		Campaigns = require('./campaigns.js');
		Frontend = require('./frontend.js');
		notification = require('./notifications.js');
		Forms = require('./forms');
		sessions = require('./session.js');
		Handler = require('./handler.js');
		ClientObject = require('./clientobject.js');
		Inbound = require('./inbound.js');
		Livevars = require('./livevars.js');
		Precompiler = require('./precomp.js');
		Petals = require('./petal.js');
		GC = require('./gc.js');
		scheduler = require('./scheduler.js');
		Role = require('./role.js');
	};

	var loadHooks = function(readyToRock) {
		log('Hooks', 'Loading hooks');
		hooks.bind('init', 100, readyToRock);
		hooks.bind('user_loggedin', 100, function(cli) {
			cli.redirect(cli._c.server.url + "/" + cli._c.paths.admin, false);
			return true;
		});
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

		admin.registerAdminEndpoint('sites', 'GET', function(cli) {
			cli.touch('admin.GET.sites');
			sites.handleGET(cli);
		});
		
		admin.registerAdminEndpoint('dashboard', 'GET', function(cli) {
			cli.touch("admin.GET.dashboard");
			admin.handleGETDashboard(cli);
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

		admin.registerAdminEndpoint('campaigns', 'POST', function(cli) {
			cli.touch('admin.POST.campaigns');
			Campaigns.handlePOST(cli);
		});
		
		admin.registerAdminEndpoint('settings', 'GET', function(cli) {
			cli.touch('admin.GET.settings');
			settings.handleGET(cli);
		});

        admin.registerAdminEndpoint('role', 'GET', function(cli) {
            cli.touch('admin.GET.role');
            Role.handleGET(cli);
        });

        admin.registerAdminEndpoint('role', 'POST', function(cli) {
            cli.touch('admin.POST.role');
            Role.handlePOST(cli);
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

	var loadGlobalPetals = function() {
		Petals.register('adminbar',  _c.default().server.base + 'backend/dynamic/admin/adminbar.petal');
		Petals.register('adminhead', _c.default().server.base + 'backend/dynamic/admin/adminhead.petal');
		Petals.register('adminsidebar', _c.default().server.base + 'backend/dynamic/admin/adminsidebar.petal');
	};

	var loadImageSizes = function() {
		imageSize.add("thumbnail", 150, '150');
		imageSize.add("medium", 300, '*');
		imageSize.add("Archive-thumbnail", 400, 400);
	}

	var loadAdminMenus = function() {
		var aurl = _c.default().server.url + "/admin/";

		admin.registerAdminMenu({
			id : "sites", faicon : "fa-sitemap", displayname : "Sites", priority : 50,
			rights : ["manage-sites"], absURL : aurl + "sites", children : []
		});
		admin.registerAdminMenu({
			id : "dashboard", faicon : "fa-tachometer", displayname : "Dashboard", priority : 100,
			rights : ["dash"], absURL : aurl + "dashboard", children : []
		});
		admin.registerAdminMenu({
			id : "articles", faicon : "fa-pencil", displayname : "Articles", priority : 200,
			rights : ["view-content"], absURL : aurl + "article", children : []
		});
		admin.registerAdminMenu({
			id : "campaigns", faicon : "fa-line-chart", displayname : "Campaigns", priority : 300,
			rights : ["view-campaigns"], absURL : aurl + "campaigns", children : []
		});
		admin.registerAdminMenu({
			id : "media", faicon : "fa-picture-o", displayname : "Media", priority : 400,
			rights : ["view-media"], absURL : aurl + "media/list", children : []
		});
		admin.registerAdminMenu({
			id : "entities", faicon : "fa-users", displayname : "Entities", priority : 500,
			rights : ["view-entities"], absURL : aurl + "entities", children : []
		});
		admin.registerAdminMenu({
			id : "themes", faicon : "fa-paint-brush", displayname : "Themes", priority : 600,
			rights : ["manage-themes"], absURL : aurl + "themes", children : []
		});
		admin.registerAdminMenu({
			id : "plugins", faicon : "fa-plug", displayname : "Plugins", priority : 700,
			rights : ["manage-plugins"], absURL : aurl + "plugins", children : []
		});
		admin.registerAdminMenu({
			id : "settings", faicon : "fa-cogs", displayname : "Settings", priority : 1000,
			rights : ["manage-settings"], absURL : aurl + "settings/", children : []
		});
	};

	var loadPlugins = function(cb) {
		log('Plugins', 'Loading plugins');

		plugins.bindEndpoints();

		var fireEvent = function() {
			log('Plugins', 'Loaded plugins');
			return cb();
		};

		db.findToArray(_c.default(), 'plugins', {"active":true}, function(err, results) {
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
        entities.registerRole({
          name: 'admin',
          displayname: 'admin'
      }, ['dash', 'admin'], function() {
          return;
        }, true);

		entities.cacheRoles(cb);
	};

	var loadProducts = function(cb) {
		db.findToArray(_c.default(), 'products', {}, function(err, arr) {
			for (var i = 0; i < arr.length; i++) {
				Products.registerProduct(arr[i]);
			}

			db.findToArray(_c.default(), 'producttypes', {}, function(err, arr) {
				for (var i = 0; i < arr.length; i++) {
					Products.registerProductType(arr[i].name, arr[i].displayName);
				}

				db.findToArray(_c.default(), 'productpricebases', {}, function(err, arr) {
					for (var i = 0; i < arr.length; i++) {
						Products.registerPriceBase(arr[i].name, arr[i].displayName, arr[i].divider);
					}

					log('Products', 'Loaded products info from database');
					Campaigns.loadCampaignsStatuses(cb);
				});
			});
		});
	};

	var loadTheme = function(cb) {
		log('Themes', 'Loading Theme');
		themes.bindEndpoints();

		var fireEvent = function() {
			log('Themes', 'Loaded Themes');
			hooks.fire('themes');

			cb();
		};

		db.find(_c.default(), 'themes', {"active":true}, {limit:[1]}, function(err, cursor) {
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
						themes.enableTheme(_c.default().website.flower, function() {
							fireEvent();
						});
					};
					cursor.close();
				}
			});
		});

	}

	var testDatabase = function(callback) {
		log('Database', 'Testing databases');

		_c.each(function(conf, next) {
			var dbinit = function() {
				log('Database', 'Initializing database if not initialized');
				db.initDatabase(conf, function(err) {
					log('Database', 'Firing Database init signal');
					dbconn();
				});
			};

			var dbconn = function() {
				log ('Database', 'Requesting dynamic connection object');
				db.createPool(conf, function() {
					log('Database', 'Firing Database connection signal');
					next();
				});
			};

			db.testConnection(conf, function(err) {
				hooks.fire('dbtest', err);
				dbinit();
			});
		}, callback);
	};

	var loadStaticSymlink = function(callback) {
		log('FileServer', 'Creating symlink for static files.');
		hooks.bind('staticsymlink', 100, function(err) {
			if (err) {
				log('Core', 'Could not create symlink : ' + err);
			}

			callback();
		});

		_c.eachSync(function(conf) {
			var to = conf.server.html + '/static';
			var rootDir = conf.server.base + 'backend/static/';
			cli.createSymlink(rootDir, to);

			to =   conf.server.html + '/bower';
			rootDir = conf.server.base + 'bower_components/';
			cli.createSymlink(rootDir, to);

			to =   conf.server.html + '/uploads';
			rootDir = conf.server.base + 'backend/static/uploads/';
			cli.createSymlink(rootDir, to);

			to =   conf.server.html + '/plugins';
			rootDir = conf.server.base + 'plugins/';
			cli.createSymlink(rootDir, to);
		});
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
		if (_c.default().env == 'dev') {
			log("CacheInvalidator", 'Clearing old cached files in db');

			db.remove(_c.default(), 'cachedFiles', {}, function() {}, false);
		}
		log("CacheInvalidator", 'Initializing cacheInvalidator');
		cacheInvalidator.init(function () {
			log("CacheInvalidator", 'Ready to invalidate cached files!');
		});
	};

	var scheduleGC = function() {
		log('GC', 'Scheduling temporary file collection');
		scheduler.schedule('GCcollecttmp', {
			every : {
				secondCount : 1000 * 60 * 60
			}
		}, function() {
			GC.clearTempFiles(function() {
				log("GC", "Scheduled temporary files collection done");
			});
		});
	};

	var loadHTMLStructure = function(callback) {
		_c.each(function(conf) {
			fileserver.createDirIfNotExists(conf.server.html, function(valid) {
				if (valid) {
					log('FileServer',
						'HTML Directory was validated at : ' +
						conf.server.html
					);
				} else {
					log('FileServer', 'Error validated html directory');
				}
	
			}, true);
		});

		loadStaticSymlink(callback);
	};

	var loadLiveVars = function() {
		admin.registerLiveVar();
		Article.registerContentLiveVar();
		Media.registerMediaLiveVar();
		dfp.registerLiveVar();
		Campaigns.registerLiveVar();
		entities.registerLiveVars();
		Products.registerLiveVar();
		plugins.registerLiveVar();
		themes.registerLiveVar();
		sites.registerLiveVar();
		settings.registerLiveVar();
		Livevars.registerDebugEndpoint();
	};

	var loadPostman = function() {
		postman.createTransporter();
	};

	var loadDFP = function(cb) {
		log("DFP", "Loading core user");
		dfp.createUser();
		dfp.scheduleDeepCopy();

		if (_c.default.env == 'dev') {
			dfp.createDevEnv();
		}
	};

	var loadForms = function() {
        	Forms.init();

		Campaigns.registerCreationForm();
		entities.registerCreationForm();
		LoginLib.registerLoginForm();
	        Article.registerForms();
		settings.registerForm();
	};

	var loadNotifications = function() {
		notification.init();
		log('Notifications', 'Sockets ready');
	}

	var loadFrontend = function() {
		Frontend.registerFromCore();
	};

	var loadSessions = function(cb) {
		sessions.initSessionsFromDatabase(cb);
	};

	var loadSites = function(cb) {
		sites = require('./sites.js');
		sites.cacheSitesFromDatabase(function() {
			sites.loadSites(cb);
		});
	};

	var loadRequestHandler = function() {
		hooks.bind('request', 1000, function(params) {
			// Run main modules
			var clientObject = new ClientObject(params.req, params.resp);
			Handler.handle(clientObject);
		});
	};

	var loadPrecompiledStaticFiles = function(callback) {
		_c.each(function(conf, next) {
			var base = conf.server.base;
			var htmlbase = conf.server.html;

			Frontend.registerJSFile(base + "backend/static/jq.js", 150, "admin");
			Frontend.registerJSFile(base + "backend/static/bootstrap.min.js", 200, "admin");
			Frontend.registerJSFile(base + "backend/static/socket.io.js", 400, "admin");
			Frontend.registerJSFile(base + "bower_components/ckeditor/ckeditor.js", 600, "admin");
			Frontend.registerJSFile(base + "bower_components/ckeditor/adapters/jquery.js", 800, "admin");
			Frontend.registerJSFile(base + "bower_components/jquery-timeago/jquery.timeago.js", 810, "admin");
			Frontend.registerJSFile(base + "bower_components/jquery-deserialize/dist/jquery.deserialize.min.js", 1000, "admin");
			Frontend.registerJSFile(htmlbase + "/compiled/lilium.js", 2000, 'admin');

			Frontend.registerCSSFile(htmlbase + "/bower/bootstrap/dist/css/bootstrap.min.css", 300, 'admin');
			Frontend.registerCSSFile(htmlbase + "/bower/ckeditor/samples/css/samples.css", 500, 'admin');
			Frontend.registerCSSFile(base + "backend/static/fontawesome.css", 1000, 'admin');
			Frontend.registerCSSFile(htmlbase + "/compiled/lilium.css", 2000, 'admin');

			Precompiler.precompile(conf, next);
		}, callback);
	};

	var prepareDefaultSiteCreation = function(cb) {
		require('./init.js')(cb);
	};

	var loadWebsites = function(loadEverything) {
		var currentRoot = __dirname;
		var fss = require('./fileserver.js');

		fss.dirExists(currentRoot + "/sites", function(exists) {
			if (exists) {
				fss.fileExists(currentRoot + "/sites/default.json", function(exists) {
					if (exists) {
						loadEverything();
					} else {
						prepareDefaultSiteCreation(loadEverything);
					}
				});
			} else {
				prepareDefaultSiteCreation(loadEverything);
			}
		});
	};

	var redirectIfInit = function(resp, cb) {
		if (resp) {
			resp.writeHead(200,
  				{ "Content-Type" : "text/html" }
			);
			resp.end(
				'<i>Please wait a moment...</i><script>setTimeout(function() {window.location = "'+resp.redirectTo+'"}, 1000);</script>',
				'utf8',
				function() {
					resp.req.connection.unref();
					resp.req.connection.destroy();
					resp.server.close(cb);
				}
			);
		} else {
			cb();
		}
	};

	this.makeEverythingSuperAwesome = function(readyToRock) {
		log('Core', 'Initializing Lilium');
		loadWebsites(function(resp) { 
			loadSites(function() {
				loadRequires();
				loadHooks(readyToRock);
				loadEndpoints();
				loadStandardInput();
				loadImageSizes();
				loadForms();
				loadLiveVars();
				loadDFP();
				loadFrontend();
				loadRequestHandler();
				loadGlobalPetals();
				loadAdminMenus();

				loadHTMLStructure(function() {
				testDatabase(function() {
				loadPlugins(function(){
				loadRoles(function() {
				loadProducts(function() {
				loadPrecompiledStaticFiles(function() {
				loadSessions(function() {
				loadTheme(function() {
				redirectIfInit(resp, function() {
					loadCacheInvalidator();
					scheduleGC();

					log('Lilium', 'Starting inbound server');
					Inbound.createServer();
		     	     		loadNotifications();
					Inbound.start();
			
					log('Core', 'Firing initialized signal');
					hooks.fire('init');
				});});});});});});});});});
			});
		});
	};

	var init = function() {
		log('Core', 'Lilium core object was created');
	};

	init();
};

module.exports = new Core();
