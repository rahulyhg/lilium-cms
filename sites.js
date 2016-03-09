var config = require('./config.js');
var log = require('./log.js');
var livevars = require('./livevars.js');
var fileserver = require('./fileserver.js');
var filelogic = require('./filelogic.js');
var formbuilder = require('./formBuilder.js');
var db = require('./includes/db.js');
var fs = require('fs');

var _cachedSites = new Array();

var Sites = function() {
	this.registerLiveVar = function() {
		livevars.registerLiveVariable('sites', function(cli, levels, params, cb) {
			var len = levels.length;

			if (len == 0 || levels[0] == "simple") {
				cb(config.getSimpleSites());
			} else if (levels[0] == "complex") {
				cb(config.getAllSites());
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
		db.testConnectionFromParams(dat.dbhost, dat.dbport, dat.dbuser, dat.dbpass, dat.dbname, function(success, err) {
			if (success) {
				createSite(cli, dat, function() {
					cli.redirect(cli._c.server.url + "admin/sites/", false);
				});
			} else {
				cli.redirect(cli._c.server.url + cli.routeinfo.fullpath + "?error=db&message=" + err, false);
			}
		});
	};

	var createSite = function(cli, postdata, done) {
		var conf = require('./config.js.dist');
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
		conf.default.id = postdata.baseurl.replace(/\//g, '');
		
		var ws = fs.createWriteStream(__dirname + "/sites/" + conf.default.id + ".json", {
			flags: 'w+',
			defaultEncoding: 'utf8'
		});
	
		ws.write(JSON.stringify(conf.default), 'utf8', function() {
			ws.end();
			config.registerConfigs(conf.default.id, conf.default);
			
			done();
		});
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
