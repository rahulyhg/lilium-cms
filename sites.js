var config = require('./config.js');
var log = require('./log.js');
var livevars = require('./livevars.js');
var fileserver = require('./fileserver.js');
var filelogic = require('./filelogic.js');
var formbuilder = require('./formBuilder.js');
var db = require('./includes/db.js');
var fs = require('fs');
var Precompiler = require('./precomp.js');
var Frontend = require('./frontend.js');
var hooks = require('./hooks.js');

var _cachedSites = new Array();

var SiteInitializer = function(conf) {
	var conf = conf;
	var rootpath = __dirname;
	
	var loadHTMLStructure = function(done) {
		fileserver.createDirIfNotExists(conf.server.html, function(valid) {
			if (valid) {
				log('FileServer',
					'HTML Directory was validated at : ' +
					conf.server.html
				);
			} else {
				log('FileServer', 'Error validated html directory');
			}
	
			done();
		}, true);
	};

	var loadStaticSymlinks = function(done) {
		var to = conf.server.html + '/static';
		var rootDir = conf.server.base + 'backend/static/';
		fileserver.createSymlinkSync(rootDir, to);

		to =   conf.server.html + '/bower';
		rootDir = conf.server.base + 'bower_components/';
		fileserver.createSymlinkSync(rootDir, to);

		to =   conf.server.html + '/uploads';
		rootDir = conf.server.base + 'backend/static/uploads/';
		fileserver.createSymlinkSync(rootDir, to);

		to =   conf.server.html + '/plugins';
		rootDir = conf.server.base + 'plugins/';
		fileserver.createSymlinkSync(rootDir, to);
	
		done();
	};

	var loadDatabase = function(done) {
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
				done();
			});
		};

		db.testConnection(conf, function(err) {
			hooks.fire('dbtest', err);
			dbinit();
		});
	};

	var precompile = function(done) {
		var base = conf.server.base;
		var htmlbase = conf.server.html;

		Frontend.registerJSFile(base + "backend/static/jq.js", 150, "admin", conf.id);
		Frontend.registerJSFile(base + "backend/static/bootstrap.min.js", 200, "admin", conf.id);
		Frontend.registerJSFile(base + "backend/static/socket.io.js", 400, "admin", conf.id);
		Frontend.registerJSFile(base + "bower_components/ckeditor/ckeditor.js", 600, "admin", conf.id);
		Frontend.registerJSFile(base + "bower_components/ckeditor/adapters/jquery.js", 800, "admin", conf.id);
		Frontend.registerJSFile(base + "bower_components/jquery-timeago/jquery.timeago.js", 810, "admin", conf.id);
		Frontend.registerJSFile(base + "bower_components/jquery-deserialize/dist/jquery.deserialize.min.js", 1000, "admin", conf.id);
		Frontend.registerJSFile(htmlbase + "/compiled/lilium.js", 2000, 'admin', conf.id);

		Frontend.registerCSSFile(htmlbase + "/bower/bootstrap/dist/css/bootstrap.min.css", 300, 'admin', conf.id);
		Frontend.registerCSSFile(htmlbase + "/bower/ckeditor/samples/css/samples.css", 500, 'admin', conf.id);
		Frontend.registerCSSFile(base + "backend/static/fontawesome.css", 1000, 'admin', conf.id);
		Frontend.registerCSSFile(htmlbase + "/compiled/lilium.css", 2000, 'admin', conf.id);

		Precompiler.precompile(conf, done);
	};

	this.initialize = function(done) {
		log('Sites', 'Initializing site with id ' + conf.id);

		loadHTMLStructure(function() {
		loadStaticSymlinks(function() {
		loadDatabase(function() {
		precompile(function() {
			done();
		});});});});
	};
};

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
			switch (param) {
				case "launch" : 
					filelogic.serveAdminLML(cli);
					break;	
				default :
					cli.debug();
			}
		}
	};

/*
"websitename": "Public Name",
"websiteemail": "email@email.com",
"dbhost": "Host",
"dbport": "Port",
"dbuser": "Username",
"dbpass": "Password",
"dbname": "Database Name",
"serverurl": "Base URL",
"serverport": "27017",
"serverhtml": "/usr/local/ryk/lilium-dev/"
*/
	this.handlePOST = function(cli) {
		var dat = cli.postdata.data;
		var that = this;
		db.testConnectionFromParams(dat.dbhost, dat.dbport, dat.dbuser, dat.dbpass, dat.dbname, function(success, err) {
			if (success) {
				that.createSite(cli, dat, function() {
					log('Sites', 'Redirecting network admin to site list');
					cli.redirect(cli._c.server.url + "admin/sites/", false);
				});
			} else {
				cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
			}
		});
	};

	this.createSite = function(cli, postdata, done) {
		var conf = require('./config.js.dist');
		var that = this;

		if (postdata.serverhtml[postdata.serverhtml.length - 1] == "/") {
			postdata.serverhtml = postdata.serverhtml.slice(0, -1);
		}
	
		if (postdata.serverurl[postdata.serverurl.length - 1] == "/") {
			postdata.serverurl = postdata.serverurl.slice(0, -1);
		}

		postdata.baseurl = "//" + postdata.serverurl.replace(/(https?\:)?\/\//, '');

		conf.default.data.host = postdata.dbhost;
		conf.default.data.port = postdata.dbport;
		conf.default.data.user = postdata.dbuser;
		conf.default.data.pass = postdata.dbpass;
		conf.default.data.use  = postdata.dbname;

		// Server
		conf.default.server.base = __dirname + "/";
		conf.default.server.html = postdata.serverhtml;
		conf.default.server.url = postdata.baseurl;
		conf.default.server.port = postdata.serverport;

		// Admin info
		conf.default.info.project = postdata.websitename || "A Lilium Website";
		conf.default.website.sitetitle = conf.default.info.project;
		conf.default.emails.default = postdata.websiteemail || "";
		conf.default.id = postdata.baseurl.replace(/\/\//g, '');
	
		var filename = postdata.baseurl.replace(/\/\//g, '').replace(/\//g, ' ');
		var ws = fs.createWriteStream(__dirname + "/sites/" + filename + ".json", {
			flags: 'w+',
			defaultEncoding: 'utf8'
		});
	
		ws.write(JSON.stringify(conf.default), 'utf8', function() {
			ws.end();
			config.registerConfigs(conf.default.id, conf.default);
			
			that.initializeWebsite(conf.default, done);
		});
	};

	this.initializeWebsite = function(conf, callback) {
		new SiteInitializer(conf).initialize(callback);
	}

	this.loadSites = function(cb) {
		var that = this;

		fileserver.listDirContent(__dirname + "/sites/", function(files) {
			var fileIndex = 0;
			var nextFile = function() {
				if (fileIndex == files.length) {
					cb();
				} else {
					var sitename = files[fileIndex].replace('.json', '');
					log('Sites', 'Loading config for website ' + sitename);

					fileserver.readJSON(__dirname + "/sites/" + files[fileIndex], function(siteInfo) {
						var keyname = sitename.replace('//', '').replace(/\s/g, '/');

						config.registerConfigs(keyname, siteInfo);
						if (sitename == 'default') {
							var urlbase = siteInfo.server.url.replace('//', '').replace(/\s/g, '/');
							config.registerConfigs(urlbase, siteInfo);
						}

						fileIndex++;
						that.initializeWebsite(config.fetchConfig(keyname), nextFile);
					});
				}
			};
			nextFile();
		});
	};

	this.registerForms = function() {
		formbuilder.createForm('launch_lilium_website', {
			fieldWrapper : {
				tag : "div",
				cssPrefix : "launchwebsite-field-"
			},
			cssClass : "form-launch-website",
			dependencies : [],
		})

		.add('title-info', 'title', {displayname : "Website information"})
		.add('websitename', 'text', {displayname : "Public name"})
		.add('websiteemail', 'email', {displayname : "Admin email"})
		.trg('websiteinfo')

		.add('title-database', 'title', {displayname : "Database"})
		.add('dbhost', 'text', {displayname : "Host"})
		.add('dbport', 'text', {displayname : "Port"})
		.add('dbuser', 'text', {displayname : "Username"})
		.add('dbpass', 'password', {displayname : "Password"})
		.add('dbname', 'text', {displayname : "Database Name"})
		.trg('database')

		.add('title-server', 'title', {displayname : "Server"})
		.add('serverurl', 'text', {displayname : "Base URL", defaultValue:"//"})
		.add('serverport', 'number', {displayname : "Port", defaultValue:"80"})
		.add('serverhtml', 'text', {displayname : "HTML File Path", defaultValue:"/usr/local/lilium/html/"})
		.trg('server')

		.trg('beforesubmit')
		.add('submit', 'submit', {
			displayname: "Launch"
		});
	};
};

module.exports = new Sites();
