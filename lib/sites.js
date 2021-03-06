var config = require('./config');

var livevars = require('../pipeline/livevars');
const filelogic = require('../pipeline/filelogic');
var analytics = require('./analytics.js');
var db = require('./db.js');
var fs = require('fs');
var hooks = require('./hooks');
var themes = require('./themes.js');
var endpoints = require('../pipeline/endpoints.js');
var sessions = require('./session.js');
var buildLib = require('../make/build');
var mail = require('./mail.js');
var sharedcache = require('./sharedcache.js');
var sitemap = require('./sitemap.js');
var adslib = require('./ads');
var roles = require('./role');
const metrics = require('./metrics');
var V4DevServer = require('../make/v4devserver');

var networkInfo = require('../network/info.js');
var isElder = networkInfo.isElderChild();
var mkdirp = require('mkdirp');

var _cachedSites = new Array();

var SiteInitializer = function (conf, siteobj) {
    var conf = conf;
    var rootpath = liliumroot;
    var siteobj = siteobj;

    var loadHTMLStructure = function (done) {
        if (!isElder) { return done(); }

        filelogic.createDirIfNotExists(conf.server.html, function (valid) {
            filelogic.createDirIfNotExists(conf.server.html + "/next", function(nextvalid) {
                filelogic.createDirIfNotExists(conf.server.html + "/amp", function(nextvalid) {
                    filelogic.createDirIfNotExists(conf.server.html + "/api", function(nextvalid) {
                        if (valid && nextvalid) {
                            log('filelogic',
                                'HTML Directory was validated at : ' +
                                conf.server.html,
                                'success'
                            );
                        } else {
                            log('filelogic', 'Error validated html directories', 'err');
                        }
                
                        done();
                    }, true);
                }, true);
            }, true);
        }, true);
    };

    var loadStaticSymlinks = function (done) {
        if (!isElder) { return done(); }

        log('Sites', 'Initializing symlinks', 'info');
        var to = conf.server.html + '/static';
        var rootDir = conf.server.base + 'backend/static/';
        filelogic.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/uploads';
        rootDir = conf.server.base + 'backend/static/uploads/';
        mkdirp.sync(rootDir);
        filelogic.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/u';
        rootDir = conf.server.base + 'backend/static/u/';
        mkdirp.sync(rootDir);
        filelogic.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/webfonts';
        rootDir = conf.server.base + 'backend/static/webfonts/';
        mkdirp.sync(rootDir);
        filelogic.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/tinymce';
        rootDir = conf.server.base + "node_modules/tinymce/";
        filelogic.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/flatpickr';
        rootDir = conf.server.base + "node_modules/flatpickr/dist";
        filelogic.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/chartjs';
        rootDir = conf.server.base + "node_modules/chart.js/dist";
        filelogic.createSymlinkSync(rootDir, to);

        done();
    };

    var loadDatabase = function (done) {
        var dbinit = function () {
            log('Database', 'Initializing database if not initialized', 'info');
            db.initDatabase(conf, function (err) {
                log('Database', 'Firing Database init signal', 'success');
                dbconn();
            });
        };

        var dbconn = function () {
            log('Database', 'Requesting dynamic connection object', 'info');
            db.createPool(conf, function () {
                log('Database', 'Firing Database connection signal', 'success');
                if (!isElder) { return done(); }

                createIndices();
            });
        };

        var createIndices = function() {
            log('Database', 'Creating indices', 'info');
            db.createIndex(conf, "content", {title : 'text', content : 'text', subtitle : 'text'}, function() {
                db.createIndex(conf, "styledpages", {slug : 1}, function() {
                    db.createIndex(conf, "content", {date : 1}, function() {
                        db.createIndex(conf, "content", {date : -1}, function() {
                            db.createIndex(conf, 'entities', {username : "text", displayname : "text", email : "text"}, function() {
                                log('Database', 'Created indices', 'success');
                                done();
                            });
                        });
                    });
                });
            });
        };

        db.testConnection(conf, function (err) {
            hooks.fire('dbtest', err);
            dbinit();
        });
    };

    var update = function(conf, done) {
        if (!isElder || global.__TEST) { return done(); }

        log('Sites', "Checking for updates");
        var versions = require('../updates/versions.json');
        db.findToArray(conf, 'lilium', {}, function(err, dbv) {
            var vIndex = -1;
            var dbvo = {};
            for (var i = 0; i < dbv.length; i++) {
                dbvo[dbv[i].v] = dbv[i];
            }

            var allVersions = Object.keys(versions);
            var checkNextVersion = function() {
                vIndex++;
                if (vIndex == allVersions.length) {
                    log("Sites", "Done updating Lilium", "lilium");
                    done();
                } else {
                    var databaseVersion = allVersions[vIndex];
                    if (dbvo[databaseVersion]) {
                        checkNextVersion();
                    } else {
                        var vinfo = versions[allVersions[vIndex]];
                        vinfo.v = allVersions[vIndex];

                        log("Sites", "Firing update script for version " + vinfo.v, "info");
                        require('../updates/' + vinfo.script)(conf, function() {
                            log("Sites", "Updated to version " + vinfo.v, "success");
                            db.insert(conf, 'lilium', vinfo, checkNextVersion);
                        });
                    }
                }
            };

            checkNextVersion();
        });
    };

    var loadTheme = function(cb) {
        log('Sites', "About to load the theme files for " + conf.website.sitetitle, 'info');
        themes.initializeSite(conf, function() {
            cb();
        });
    };



    var loadSessions = function(cb) {
        if (!isElder) { return cb(); }
        roles.loadRolesInCache(() => {
            sessions.initSessionsFromDatabase(conf, () => {
                require('../pipeline/api.js').loadSessionsInCache(cb);
            });
        });
    };

    var checkForWP = function(conf) {
        if (isElder && conf.wptransferring) {
            log('Sites', 'Resuming Wordpress transfer for site ' + conf.id);
            siteobj.wptransfer(undefined, conf.wpdb, true);
        }
    };

    var loadRobots = function(conf, cb) {
        if (!isElder) { return cb(); }

        const defaultFile = conf.server.base + "backend/static/robots.txt";
        const pkg = { content : "" };

        fs.readFile(defaultFile, {}, (err, robots) => {
            pkg.content = robots || "";
            hooks.fireAsync(conf, 'robots_file_will_compile', pkg, () => {
                const output = conf.server.html + "/robots.txt";
                log('Sites', 'Writing robots.txt file to ' + output, 'info');
                fs.unlink(output, () => {
                    fs.writeFile(output, pkg.content, { encoding : 'utf8' }, () => cb());
                });
            });
        });
    };

    this.initialize = function (done) {
        log('Sites', 'Initializing site with id ' + conf.id, 'lilium');

        var compileKey = "lml" + Math.random().toString().substring(2) + Math.random().toString().substring(2);
        conf.compilekey = compileKey;

        if (global.liliumenv.caij) {
            log.setLevels(["err", "warn", "lilium"]);
        } else if (conf.env == "prod") {
            log.setLevels(["err", "warn", "lilium"]);
        } else if (conf.env == "dev") {
            log.setLevels(["success", "detail", "live", "err", "warn", "info", "lilium"]);
        } else if (conf.env == "output") {
            log.setLevels(["none", "info", "success", "detail", "live", "err", "warn", "lilium"]);
        }

        hooks.fireSite(conf, 'site_will_initialize', {});
        endpoints.addSite(conf.id);
        analytics.addSite(conf);
        adslib.registerSite(conf.id);

        loadHTMLStructure(function () {
            loadStaticSymlinks(function () {
                loadDatabase(function () {
                    log('Sites', 'Initializing email senders', 'info');
                    if (/*isElder &&*/ conf.emails) {
                        mail.setSender(conf.id, {
                            user : conf.emails.senderemail,
                            pass : conf.emails.senderpass,
                            from : conf.emails.senderfrom
                        });
                    }

                    if (conf.autositemap && isElder && (global.liliumenv.mode != "script" || global.liliumenv.caij)) {
                        sitemap.scheduleCreation(conf, true);
                    }

                    if (isElder) {
                        log('Sites', "Loading polling for elder child", 'info');
                        analytics.pollRealtime(conf);
                    }

                    if (isElder) {
                        log('Sites', 'V4 will load all older URL in cache front', 'info');
                        const V4 = require('./v4');
                        const v4 = new V4();
                        v4.dumpV3UrlInFront(conf, () => {
                            log('Sites', 'Old URLs will now redirect to new version', 'success');
                        });

                        v4.makeAppMainDependency(conf);

                        const buildLib = require('../make/build');   
                        const cssBuildLib = require('../make/cssbuilder'); 
                        const pathLib = require('path');

                        const fs = require('fs');

                        buildLib.pushToBuildTree(conf, 'lilium', 'lilium', {
                            outputpath : pathLib.join(conf.server.html, 'lmlbackend'),
                            babel : {
                                "plugins": [
                                    ["transform-react-jsx", { "pragma":"h" }],
                                    ["transform-class-properties"],
                                    ["@babel/plugin-proposal-object-rest-spread", {
                                        useBuildIns : true
                                    }],
                                ],
                                "presets" : [
                                    [ "@babel/preset-env" ]
                                ]
                            },
                            dontOverwite : true
                        });

                        this.v4devserver = new V4DevServer(conf);
                        this.v4devserver.start();
                    }

                    loadTheme(function() {
                        if (global.liliumenv.mode == "script" || global.liliumenv.caij) {
                            return done();
                        }

                        loadSessions(function() {
                            loadRobots(conf, function() {
                                update(conf, function() {
                                    sharedcache.hi();

                                    checkForWP(conf);
                                    hooks.fire('site_initialized', conf);
                                    log('Sites', 'Initialized site with id ' + conf.id, 'success');
                                    done();
                                });
                            });
                        });  
                    });
                });
            });
        });
    };
};

var Sites = function () {
    this.wptransfer = function(cli, dat, noredir) {
        var dat = cli ? cli.postdata.data : dat;
        var that = this;

        var existingSite = dat.originalsite;

        // cli.did('sites', 'wptransfer', dat);
        log('Sites', 'Initiating Wordpress website transfer');
        if (existingSite && existingSite != "") {
            log('Sites', 'Transferring Wordpress data to site with uid ' + existingSite);
            var Configs = require('./config');
            var siteConf = Configs.fetchConfig(existingSite);
            siteConf.wptransferring = true;
            siteConf.wpdb = dat;
            if (!siteConf.wordpress) {
                siteConf.wordpress = {};
            }

            siteConf.wordpress.originalurl = dat.originalurl || "";
            siteConf.wordpress.wpuploadslocaldir = dat.wpuploadslocaldir || "";

            require('../includes/wpSQL.js').transfer(siteConf.id, dat, function(err) {
                log('Sites', 'Transfer in process');
                if (err) {
                    log('Sites', 'Error while transferring site with uid ' + existingSite + ' : ' + err);
                    if (!noredir) cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
                } else {
                    log('Sites', 'No error detected so far for Wordpress transfer to site with uid ' + existingSite);

                    Configs.saveConfigs(siteConf, function() {
                        log('Sites', 'Redirecting client to sites list');
                        if (!noredir) cli.redirect(cli._c.server.url + "/admin/sites/", false);
                    });
                }
            });
        } else {
            log('Sites', 'Creation of Lilium website', 'lilium');
            db.testConnectionFromParams(dat.dbhost, dat.dbport, dat.dbuser, dat.dbpass, dat.dbname, function (success, err) {
                if (success) {
                    db.testConnectionFromParams(
                        dat.wpsitedataurl, 
                        dat.wpsitedataport, 
                        dat.wpsitedatauser, 
                        dat.wpsitedatapwd, 
                        dat.wpsitedataname, 
                    function (success, err) {
                        if (success) {
                            dat.wptransfer = true;
                        
                            if (!existingSite || existingSite == '') {
                                cli.redirect(cli_c.server.url + "admin/sites/", false);
                                return;
        
                                that.createSite(cli, dat, function () {
                                    log('Sites', 'Site was created. Beginning Wordpress migration.', 'success');
                                    
                                    require('../includes/wpdump.js').dump(cli, {
                                        
                                    }, function() {
    
                                    });
    
                                    cli.redirect(cli._c.server.url + "admin/sites/", false);
                                }); 
                            } else {
                                require('../includes/wpSQL.js').transfer(existingSite, dat, function(err) {
                                    if (err) {
                                        cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
                                    } else {
                                        var siteConf = require('./config').fetchConfig(existingSite);
                                        siteConf.wptransferring = true;
                                        siteConf.wpdb = dat;
    
                                        siteConf.saveConfigs(siteConf, function() {
                                            cli.redirect(cli._c.server.url + "/admin/sites/", false);
                                        });
                                    }
                                });
                            }
                        } else {
                            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
                        }
                    }, 'mysql');
                } else {
                    cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
                }
            });
        }
    };

    this.createSite = function (cli, postdata, done) {
        var conf = require('../config.js.dist');
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
        conf.default.data.use = postdata.dbname;

        // Server
        conf.default.server.base = liliumroot + "/";
        conf.default.server.html = postdata.serverhtml;
        conf.default.server.url = postdata.baseurl;
        conf.default.server.port = postdata.serverport;

        // Admin info
        conf.default.info.project = postdata.websitename || "A Lilium Website";
        conf.default.website.sitetitle = conf.default.info.project;
        conf.default.emails.default = postdata.websiteemail || "";
        conf.default.id = postdata.baseurl.replace(/\/\//g, '');

        conf.default.uid = Math.random().toString().slice(2);

        conf.default.wptransfer = postdata.wptransfer;
        conf.default.wptransferring = postdata.wptransfer;
        conf.default.wordpress = {
            originalurl : postdata.originalurl,
            wpuploadslocaldir : postdata.wpuploadslocaldir
        };

        var filename = postdata.baseurl.replace(/\/\//g, '').replace(/\//g, ' ');
        var ws = fs.createWriteStream(liliumroot + "/sites/" + filename + ".json", {
            flags: 'w+',
            defaultEncoding: 'utf8'
        });

        ws.write(JSON.stringify(conf.default), 'utf8', function () {
            ws.end();
            config.registerConfigs(conf.default.id, conf.default);

            that.initializeWebsite(conf.default, function () {
                that.precompile(done);
            });
        });
    };

    this.initializeWebsite = function (conf, callback) {
        new SiteInitializer(conf, this).initialize(callback);
    };

    this.loopPrecomp = function (done) {
        var s = _cachedSites;
        var len = s.length;
        var index = 0;

        log("Sites", "Precompiling static files", 'info');
        var now = Date.now();
        var execPreComp = function () {
            if (index === len) {
                var later = Date.now() - now;
                log('Sites', 'Precompiled static files in ' + later + "ms", "info");
                done();
            } else {
                (new SiteInitializer(s[index])).precompile(function () {
                    index++;
                    execPreComp();
                });
            }
        };
        execPreComp();
    };

    this.loadSites = function (cb) {
        var that = this;
        log('Sites', 'Reading sites directory for websites configurations', 'info');
        filelogic.listDirContent(liliumroot + "/sites/", function (files) {
            files = files.filter(x => x.endsWith('.json'));
            files.unshift(files.splice(files.indexOf('default.json'), 1)[0]);
            log('Sites', 'Found ' + files.length + ' sites', 'info');

            var fileIndex = 0;
            var nextFile = function () {
                if (fileIndex == files.length) {
                    cb();
                } else {
                    var sitename = files[fileIndex].replace('.json', '');
                    log('Sites', 'Loading config for website ' + sitename, 'lilium');

                    filelogic.readJSON(liliumroot + "/sites/" + files[fileIndex], function (siteInfo) {
                        var keyname = sitename.replace('//', '').replace(/\s/g, '/');
                        siteInfo.jsonfile = files[fileIndex];

                        if (!siteInfo.server.base) {
                            siteInfo.server.base = liliumroot + "/";
                        }
                        if (!siteInfo.server.html) {
                            siteInfo.server.html = require('path').join(liliumroot, "html");
                        }

                        config.registerConfigs(keyname, siteInfo);
                        if (sitename == 'default') {
                            var urlbase = siteInfo.server.url.replace('//', '').replace(/\s/g, '/');
                            config.registerConfigs(urlbase, siteInfo);
                        }

                        // Convenience props
                        siteInfo.server.fullurl = (siteInfo.server.protocol || "http:") + siteInfo.server.url;

                        _cachedSites.push(siteInfo);
                        fileIndex++;
                        that.initializeWebsite(config.fetchConfig(keyname), nextFile);
                    });
                }
            };
            nextFile();
        });
    };

    this.getSites = function() {
            return _cachedSites;
    };

    this.form = function () {
    
    }
};

module.exports = new Sites();
