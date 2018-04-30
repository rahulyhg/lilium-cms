var config = require('./config.js');
var log = require('./log.js');
var livevars = require('./livevars.js');
var fileserver = require('./fileserver.js');
var filelogic = require('./filelogic.js');
var analytics = require('./analytics.js');
var formbuilder = require('./formBuilder.js');
var db = require('./includes/db.js');
var fs = require('fs');
var Precompiler = require('./precomp.js');
var Frontend = require('./frontend.js');
var hooks = require('./hooks.js');
var themes = require('./themes.js');
var endpoints = require('./endpoints.js');
var sessions = require('./session.js');
var templateBuilder = require('./templateBuilder.js');
var category = require('./category.js');
var badges = require('./badges.js');
var events = require('./events.js');
var various = require('./various.js');
var mail = require('./mail.js');
var sharedcache = require('./sharedcache.js');
var sitemap = require('./sitemap.js');
var analytics = require('./analytics.js');
var adslib = require('./ads');

var networkInfo = require('./network/info.js');
var isElder = networkInfo.isElderChild();

var _cachedSites = new Array();

var SiteInitializer = function (conf, siteobj) {
    var conf = conf;
    var rootpath = __dirname;
    var siteobj = siteobj;

    var loadHTMLStructure = function (done) {
        if (!isElder) { return done(); }

        fileserver.createDirIfNotExists(conf.server.html, function (valid) {
            fileserver.createDirIfNotExists(conf.server.html + "/next", function(nextvalid) {
                fileserver.createDirIfNotExists(conf.server.html + "/amp", function(nextvalid) {
                    fileserver.createDirIfNotExists(conf.server.html + "/api", function(nextvalid) {
                        fileserver.createDirIfNotExists(conf.server.html + "/lmldoc", function(nextvalid) {
                            if (valid && nextvalid) {
                                log('FileServer',
                                    'HTML Directory was validated at : ' +
                                    conf.server.html,
                                    'success'
                                );
                            } else {
                                log('FileServer', 'Error validated html directories', 'err');
                            }
                
                            done();
                        }, true);
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
        fileserver.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/bower';
        rootDir = conf.server.base + 'bower_components/';
        fileserver.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/uploads';
        rootDir = conf.server.base + 'backend/static/uploads/';
        fileserver.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/u';
        rootDir = conf.server.base + 'backend/static/u/';
        fileserver.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/webfonts';
        rootDir = conf.server.base + 'backend/static/webfonts/';
        fileserver.createSymlinkSync(rootDir, to);

        to = conf.server.html + '/plugins';
        rootDir = conf.server.base + 'plugins/';
        fileserver.createSymlinkSync(rootDir, to);

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
                                createCollections();
                            });
                        });
                    });
                });
            });
        };

        var createCollections = function() {
            log('Database', 'Creating collections', 'info');
            
        	var collectionsNames = [
		        "entities", "roles", "plugins", "themes", "config", "compiledfiles", "preview", "topics",
        		"sites", "discussions", "types", "vocab", "content", "sessions", "dfpcache", "history", "searches",
		        "lilium", "uploads", "cachedFiles", "dfp", "personas", "secrets", "conversations", "communications",
		        "messages", "notifications", "categories", "autosave", "userbadges", "teambadges", "styledpages"
        	];

            db.createCollections(conf, collectionsNames, function() {
                log('Database', 'Database initialization finished', 'lilium');
                done();
            });
        };

        db.testConnection(conf, function (err) {
            hooks.fire('dbtest', err);
            dbinit();
        });
    };

    this.precompile = function (done) {
        if (!isElder) { return done(); }

        var base = conf.server.base;
        var htmlbase = conf.server.html;

        log('SiteInitializer', "Registering admin default frontend JS and CSS", 'info');
        Frontend.registerJSFile(base + "/compiled/admin/js/const.js", 100, "admin", conf.id);
        Frontend.registerJSFile(base + "backend/static/jq.js", 150, "admin", conf.id);
        Frontend.registerJSFile(base + "backend/static/mousetrap.js", 250, "admin", conf.id);
        Frontend.registerJSFile(base + "backend/static/highlight.js", 290, "admin", conf.id);
        Frontend.registerJSFile(base + "backend/static/formathtml.js", 320, "admin", conf.id);
        Frontend.registerJSFile(base + "backend/static/socket.io.js", 400, "admin", conf.id);
        Frontend.registerJSFile(base + "backend/static/leaflet/leaflet.js", 410, "admin", conf.id);
        Frontend.registerJSFile(base + "backend/static/dateformat.js", 600, 'admin', conf.id);
        Frontend.registerJSFile(base + "bower_components/flatpickr/dist/flatpickr.min.js", 700, 'admin', conf.id);
        Frontend.registerJSFile(base + "bower_components/ckeditor/adapters/jquery.js", 808, "admin", conf.id);
        Frontend.registerJSFile(base + "bower_components/jquery-timeago/jquery.timeago.js", 810, "admin", conf.id);
        Frontend.registerJSFile(base + "bower_components/jquery-deserialize/dist/jquery.deserialize.min.js", 1000, "admin", conf.id);
        Frontend.registerJSFile(base + "bower_components/jquery-timer/jquery.timer.js", 1100, "admin", conf.id);
        Frontend.registerJSFile(base + "bower_components/jquery.clickout/jquery.clickout.js", 1250, "admin", conf.id);
        Frontend.registerJSFile(base + "bower_components/deep-diff/releases/deep-diff-0.3.3.min.js", 1350, "admin", conf.id);
        Frontend.registerJSFile(base + "bower_components/linkifyjs/linkify.min.js", 1500, "admin", conf.id);
        Frontend.registerJSFile(base + "bower_components/linkifyjs/linkify-html.min.js", 1510, "admin", conf.id);
        Frontend.registerJSFile(base + "bower_components/Sortable/Sortable.min.js", 1800, "admin", conf.id);
        Frontend.registerJSFile(base + "node_modules/lilium-text/build/liliumtext.js", 1850, "admin", conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/dom.js", 1900, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/lilium.js", 2000, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/facebook.js", 2025, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/liliumtext.js", 2055, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/livevars.js", 2100, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/lmldom-bunch.js", 2105, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/lmldom-json.js", 2106, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/lmldom-widgets.js", 2107, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/lmldom.js", 2110, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/badges.js", 2130, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/preview.js", 2150, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/lmleditor.js", 2170, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/pushtable.js", 2200, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/treeselect.js", 2210, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/imagepicker.js", 2220, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/imagestudio.js", 2225, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/backendsearch.js", 2250, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/conversations.js", 2280, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/stacktable.js", 2300, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/localclip.js", 2350, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/cakepop.js", 2380, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/socket.js", 2400, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/multi-select.js", 2500, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/ckeditor-lilium.js", 1320, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/media-explorer.js", 1330, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/tags.js", 1340, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/lys.js", 1350, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/lmltable.js", 1360, 'admin', conf.id);
        Frontend.registerJSFile(base + "/backend/static/dropzone.js", 1370, 'admin', conf.id);    
        Frontend.registerJSFile(base + "/backend/static/chart.js", 1375, 'admin', conf.id);    
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/quiz.js", 1380, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/album.js", 1390, 'admin', conf.id);
        Frontend.registerJSFile(htmlbase + "/compiled/admin/js/alert.js", 1400, 'admin', conf.id);

        Frontend.registerCSSFile(base + "bower_components/flatpickr/dist/flatpickr.min.css", 500, 'admin', conf.id);
        // Frontend.registerCSSFile(base + "backend/static/fontawesome.css", 1000, 'admin', conf.id);
        Frontend.registerCSSFile(base + "backend/static/fa/fontawesome-all.min.css", 1000, 'admin', conf.id);
        Frontend.registerCSSFile(base + "backend/static/leaflet/leaflet.css", 1010, 'admin', conf.id);
        Frontend.registerCSSFile(base + "backend/static/animate.css", 1050, 'admin', conf.id);
        Frontend.registerCSSFile(base + "backend/static/hightlight.agate.css", 1120, 'admin', conf.id);
        Frontend.registerCSSFile(base + "backend/static/weather-icons.min.css", 1150, 'admin', conf.id);
        Frontend.registerCSSFile(base + "node_modules/lilium-text/build/minim.min.css", 1180, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/lilium.css", 2000, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/mobile.css", 2005, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/ckeditor.css", 2100, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/badges.css", 2105, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/localclip.css", 2108, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/preview.css", 2110, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/widgets.css", 2115, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/lys.css", 2120, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/imagepicker.css", 2150, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/imagestudio.css", 2155, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/conversations.css", 2180, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/login.css", 2200, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/media.css", 2600, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/devtools.css", 2620, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/notifications.css", 2400, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/pushtable.css", 2500, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/multiselect.css", 2600, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/tags.css", 2620, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/lmltable.css", 2640, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/modals.css", 2660, 'admin', conf.id);
        Frontend.registerCSSFile(htmlbase + "/compiled/admin/css/welcome.css", 2800, 'admin', conf.id);

        hooks.fire('frontend_will_precompile', {
            config: conf,
            Frontend: Frontend
        });
        Precompiler.precompile(conf, function () {
            hooks.fire('frontend_precompiled', {
                config: conf,
                Frontend
            });
            done();
        });
    };

    var update = function(conf, done) {
        if (!isElder) { return done(); }

        log('Sites', "Checking for updates");
        var versions = require('./versions.json');
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
                        require('./updates/' + vinfo.script)(conf, function() {
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
        themes.initializeSite(conf, function() {
            if (!isElder) { return cb(); }
            templateBuilder.precompThemeFiles(conf, cb);
        });
    };

    var loadSessions = function(cb) {
        if (!isElder) { return cb(); }
        sessions.initSessionsFromDatabase(conf, () => {
            require('./api.js').loadSessionsInCache(cb);
        });
    };

    var checkForWP = function(conf) {
        if (isElder && conf.wptransferring) {
            log('Sites', 'Resuming Wordpress transfer for site ' + conf.id);
            siteobj.wptransfer(undefined, conf.wpdb, true);
        }
    };

    var loadVarious = function(done) {
        if (!isElder) { return done(); }
        various.init(conf, done);
    };

    var initEvents = function(cb) {
        if (!isElder) { return cb(); }
        events.init(conf, cb);
    };

    var loadRobots = function(cb) {
        if (!isElder) { return cb(); }
        fileserver.createSymlink(conf.server.base + "backend/static/robots.txt", conf.server.html + "/robots.txt", cb);
    };

    this.initialize = function (done) {
        log('Sites', 'Initializing site with id ' + conf.id, 'lilium');

        var compileKey = "lml" + Math.random().toString().substring(2) + Math.random().toString().substring(2);
        conf.compilekey = compileKey;

        if (conf.env == "prod") {
            log.setLevels(["err", "warn", "lilium"]);
        } else if (conf.env == "dev") {
            log.setLevels(["success", "detail", "live", "err", "warn", "info", "lilium"]);
        } else if (conf.env == "output") {
            log.setLevels(["none", "info", "success", "detail", "live", "err", "warn", "lilium"]);
        }

        hooks.fire('site_will_initialize', conf);
        endpoints.addSite(conf.id);
        analytics.addSite(conf);
        adslib.registerSite(conf.id);

        loadHTMLStructure(function () {
            loadStaticSymlinks(function () {
                loadDatabase(function () {
                    initEvents(function() {
                        templateBuilder.init(conf);

                        if (/*isElder &&*/ conf.emails) {
                            mail.setSender(conf.id, {
                                user : conf.emails.senderemail,
                                pass : conf.emails.senderpass,
                                from : conf.emails.senderfrom
                            });
                        }

                        if (isElder && (global.liliumenv.mode != "script" || global.liliumenv.caij)) {
                            sitemap.scheduleCreation(conf, true);
                        }

                        if (isElder) {
                            analytics.pollRealtime(conf);
                        }

                        loadVarious(function() {
                            loadTheme(function() {
                                if (global.liliumenv.mode == "script" || global.liliumenv.caij) {
                                    return done();
                                }

                                category.preload(conf, function() {
                                    loadSessions(function() {
                                        loadRobots(function() {
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
                });
            });
        });
    };
};

var Sites = function () {
    this.livevar = function (cli, levels, params, cb) {
        var len = levels.length;
        if (len > 0 && levels[0] == 'all') {
            db.findToArray(config.default(), 'entities', {_id : cli.userinfo.userid}, function(err, arr) {
                var sites = arr[0].sites;
                var ignore = arr[0].roles.indexOf('admin') !== -1 || arr[0].roles.indexOf('lilium') !== -1;

                if (len < 2 || levels[1] == "simple") {
                    if (levels[2] == "assoc") {
                        var assoc = config.getSimpleSitesAssoc();

                        if (ignore) {
                            cb(assoc);
                        } else {
                            var newarr = {};
                            for (var sid in assoc) {
                                if (sites.indexOf(sid) != -1) {
                                    newarr[sid] = assoc[sid];
                                }
                            }

                            cb(newarr);
                        }
                    } else {
                        var sitearr = config.getSimpleSites();

                        if (ignore) {
                            cb(sitearr);
                        } else {
                            var newarr = [];
                            for (var i = 0; i < sitearr.length; i++) {
                                if (sites.indexOf(sitearr[i].id) != -1) {
                                    newarr.push(sitearr[i]);
                                }
                            }

                            cb(newarr);
                        }
                    }
                } else if (levels[1] == "complex") {
                    var allsites = config.getAllSites();

                    if (ignore) {
                        cb(allsites); 
                    } else {
                        var newarr = [];
                        for (var i = 0; i < allsites.length; i++) {
                            if (sites.indexOf(allsites[i].id) != -1) {
                                newarr.push(allsites[i]);
                            }
                        }

                        cb(newarr);
                    }
                } else {
                    cb([]);
                }
            });
        } else if (len > 0) {
            cb("[SitesException] Cannot find sites under : " + levels[0]);
        } else {
            cb("[SitesException] Cannot use top level of Live Variable : Sites");
        }
    };

    this.adminGET = function (cli) {
        if (cli.hasRightOrRefuse("list-websites")) {
            var param = cli.routeinfo.path[2];

            if (!param) {
                filelogic.serveAdminLML(cli);
            } else {
                switch (param) {
                case "launch":
                case "wptransfer":
                    filelogic.serveAdminLML(cli);
                    break;
                default:
                    cli.debug();
                }
            }
        }
    };

    this.adminPOST = function (cli) {
        if (!cli.hasRightOrRefuse("launch-websites")) { return; }

        var dat = cli.postdata.data;
        var that = this;
        var param = cli.routeinfo.path[2];
        
        switch (param) {
            case "launch":
                db.testConnectionFromParams(dat.dbhost, dat.dbport, dat.dbuser, dat.dbpass, dat.dbname, function (success, err) {
                    if (success) {
                        that.createSite(cli, dat, function () {
                            log('Sites', 'Redirecting network admin to site list');
                            cli.did('sites', 'created', dat.websitename);
                            cli.redirect(cli._c.server.url + "admin/sites/", false);
                        });
                    } else {
                        cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
                    }
                });
            break;

            case "wptransfer":
                that.wptransfer(cli);
                break;

            default:
                cli.throwHTTP(404, 'Not Found');
        }
    };

    this.wptransfer = function(cli, dat, noredir) {
        var dat = cli ? cli.postdata.data : dat;
        var that = this;

        var existingSite = dat.originalsite;

        // cli.did('sites', 'wptransfer', dat);
        log('Sites', 'Initiating Wordpress website transfer');
        if (existingSite && existingSite != "") {
            log('Sites', 'Transferring Wordpress data to site with uid ' + existingSite);
            var Configs = require('./config.js');
            var siteConf = Configs.fetchConfig(existingSite);
            siteConf.wptransferring = true;
            siteConf.wpdb = dat;
            if (!siteConf.wordpress) {
                siteConf.wordpress = {};
            }

            siteConf.wordpress.originalurl = dat.originalurl || "";
            siteConf.wordpress.wpuploadslocaldir = dat.wpuploadslocaldir || "";

            require('./includes/wpSQL.js').transfer(siteConf.id, dat, function(err) {
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
                                    
                                    require('./includes/wpdump.js').dump(cli, {
                                        
                                    }, function() {
    
                                    });
    
                                    cli.redirect(cli._c.server.url + "admin/sites/", false);
                                }); 
                            } else {
                                require('./includes.wpSQL.js').transfer(existingSite, dat, function(err) {
                                    if (err) {
                                        cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
                                    } else {
                                        var siteConf = require('./config.js').fetchConfig(existingSite);
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
        conf.default.data.use = postdata.dbname;

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

        conf.default.uid = Math.random().toString().slice(2);

        conf.default.wptransfer = postdata.wptransfer;
        conf.default.wptransferring = postdata.wptransfer;
        conf.default.wordpress = {
            originalurl : postdata.originalurl,
            wpuploadslocaldir : postdata.wpuploadslocaldir
        };

        var filename = postdata.baseurl.replace(/\/\//g, '').replace(/\//g, ' ');
        var ws = fs.createWriteStream(__dirname + "/sites/" + filename + ".json", {
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
        if (!isElder) { return done(); }

        var s = _cachedSites;
        var len = s.length;
        var index = 0;

        log("Sites", "Precompiling static files", 'info');
        var execPreComp = function () {
            if (index === len) {
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
        fileserver.listDirContent(__dirname + "/sites/", function (files) {
            files.unshift(files.splice(files.indexOf('default.json'), 1)[0]);

            var fileIndex = 0;
            var nextFile = function () {
                if (fileIndex == files.length) {
                    cb();
                } else {
                    var sitename = files[fileIndex].replace('.json', '');
                    log('Sites', 'Loading config for website ' + sitename, 'lilium');

                    fileserver.readJSON(__dirname + "/sites/" + files[fileIndex], function (siteInfo) {
                        var keyname = sitename.replace('//', '').replace(/\s/g, '/');
                        siteInfo.jsonfile = files[fileIndex];

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
        formbuilder.registerFormTemplate('lilium_website_info')
        .add('title-info', 'title', {
                displayname: "Website information"
            })
            .add('websitename', 'text', {
                displayname: "Public name"
            })
            .add('websiteemail', 'email', {
                displayname: "Admin email"
            })
            .trg('websiteinfo')

        .add('title-database', 'title', {
                displayname: "Database"
            })
            .add('dbhost', 'text', {
                displayname: "Host"
            })
            .add('dbport', 'text', {
                displayname: "Port"
            })
            .add('dbuser', 'text', {
                displayname: "Username"
            })
            .add('dbpass', 'password', {
                displayname: "Password"
            })
            .add('dbname', 'text', {
                displayname: "Database Name"
            })
            .trg('database')

        .add('title-server', 'title', {
                displayname: "Server"
            })
            .add('serverurl', 'text', {
                displayname: "Base URL",
                defaultValue: "//"
            })
            .add('serverport', 'number', {
                displayname: "Port",
                defaultValue: "80"
            })
            .add('serverhtml', 'text', {
                displayname: "HTML File Path",
                defaultValue: "/usr/local/lilium/html/"
            })
            .trg('server');


        formbuilder.createForm('launch_lilium_website', {
            fieldWrapper: {
                tag: "div",
                cssPrefix: "launchwebsite-field-"
            },
            cssClass: "form-launch-website",
            dependencies: [],
        })
        .addTemplate('lilium_website_info')
        .trg('beforesubmit')
            .add('submit', 'submit', {
                value: "Launch"
            });

        formbuilder.createForm('wptransfer_lilium_website', {
            fieldWrapper: {
                tag: "div",
                cssPrefix: "launchwebsite-field-"
            },
            cssClass: "form-launch-website",
            dependencies: ["sites.all.complex"],
        })
        .add('title-existing-site', 'title', {
            displayname : "Existing Lilium Site"
        })
        .add('originalsite', 'livevar', {
            displayname : "Lilium Site",
            endpoint : "sites.all.complex",
            tag : "select",
            template: "option",
            title : "originalsite",
            readkey : "originalsite",
            attr: {
                lmlselect : false,
                header : 'Create a new Lilium Site'
            },
            props: {
                'value' : "uid",
                'html' : 'website.sitetitle'
            }            
        })
        .add('title-info', 'title', {
                displayname: "Wordpress site information"
            })
            .add('originalurl', {
                displayname: "Original URL without trailing slash"
            })
            .add('wpsitedataurl', {
                displayname: "Database URL"
            })
            .add('wpsitedataport', {
                displayname: "Database Port",
                datatype : "number"
            })
            .add('wpsitedataname', {
                displayname: "Database Name"
            })
            .add('wpsitedatauser', {
                displayname: "Database User"
            })
            .add('wpsitedatapwd', 'password', {
                displayname: "Database Password"
            })
        .add('title-info-uploads', 'title', {
                displayname : "Uploads"
            })
            .add('wpuploadslocaldir', 'text', {
                displayname : "Local directory"
            }, {
                required : false
            })
        .add('title-info-bridge', 'title', {
                displayname: "Wordpress bridge"
            })
            .add('wpbridgedata', {
                displayname: "Database Name"
            })

        .add('title-lml-site', 'title', {
            displayname: "Lilium site information"
        })
        .beginSection('lilium_website_info_section', {

        })
        .addTemplate("lilium_website_info")
        .closeSection('lilium_website_info_section')
        .trg('beforesubmit')
            .add('submit', 'submit', {
                value: "Transfer"
            });
    };
};

module.exports = new Sites();
