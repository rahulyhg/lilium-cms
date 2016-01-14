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
			cli.touch("admin.GET.post");
			Article.handleGET(cli);
		});

		admin.registerAdminEndpoint('article', 'POST', function(cli){
			cli.touch("admin.POST.post");
			Article.handlePOST(cli);
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

	var loadPlugins = function() {
		log('Plugins', 'Loading plugins');

		hooks.fire('plugins');
		log('Plugins', 'Loaded plugins');
	};

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

		var staticHTMLPath = _c.default.server.html + '/static';
		fileserver.dirExists(staticHTMLPath, function(exists) {
			if (!exists) {
				fileserver.createSymlink(
					_c.default.server.base + 'backend/static/',
					staticHTMLPath,
					function(err) {
						            // Symlink for bower modules
            fileserver.createSymlink(
              _c.default.server.base + 'bower_components/',
              _c.default.server.html + '/bower',
              function(err) {
                log('Core', 'Firing static symlink signal');
                hooks.fire('staticsymlink', err);
              }
            );
					}
				);
			} else {
				log('FileServer', 'Symlink already exists; Firing signal');
				hooks.fire('staticsymlink', undefined);
			}
		});
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

	var loadHTMLStructure = function(callback) {
		fileserver.createDirIfNotExists(_c.default.server.html + '/uploads/', function(valid) {
			if (valid) {
				log('FileServer',
					'Upload Directory was validated at : ' +
					_c.default.server.html + "/uploads/"
				);
			} else {
				log('FileServer', 'Error validated upload directory');
			}

			loadStaticSymlink(callback);
		}, true);
	};

	this.makeEverythingSuperAwesome = function(readyToRock) {
		log('Core', 'Initializing Lilium');
		loadHooks(readyToRock);
		loadEndpoints();
		loadPlugins();
		loadStandardInput();

		loadHTMLStructure(function() {
			testDatabase(function() {
				log('Core', 'Firing initialized signal');
				hooks.fire('init', {
					loaded : [
						"hooks", "endpoints", "plugins"
					]
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
