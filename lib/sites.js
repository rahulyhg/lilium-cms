const config = require('./config');

const analytics = require('./analytics.js');
const db = require('./db.js');
const fs = require('fs');
const hooks = require('./hooks');
const themes = require('./themes.js');
const endpoints = require('../pipeline/endpoints.js');
const sessions = require('./session.js');
const buildLib = require('../make/build');
const mail = require('./mail.js');
const sharedcache = require('./sharedcache.js');
const sitemap = require('./sitemap.js');
const adslib = require('./ads');
const roles = require('./role');
const V4DevServer = require('../make/v4devserver');

const networkInfo = require('../network/info.js');
const isElder = networkInfo.isElderChild();

const _cachedSites = [];

class SiteInitializer {
    constructor(conf) {
        this.conf = conf;
    }

    loadHTMLStructure(done) {
        if (!isElder) { return done(); }

        fs.mkdir(this.conf.server.html, { recursive : true }, (err, valid) => {
            fs.mkdir(this.conf.server.html + "/next", { recursive : true }, (err, nextvalid) => {
                fs.mkdir(this.conf.server.html + "/amp", { recursive : true }, (err, nextvalid) => {
                    fs.mkdir(this.conf.server.html + "/api", { recursive : true }, (err, nextvalid) => {
                        log('Sites', 'HTML Directory was validated at : ' + this.conf.server.html, 'success');
                
                        done();
                    }, true);
                }, true);
            }, true);
        }, true);
    };

    loadStaticSymlinks(done) {
        if (!isElder) { return done(); }

        const symlinkSync = (from, to) => {
            try {
                fs.symlinkSync(from, to);
            } catch (err) {  }
        };

        log('Sites', 'Initializing symlinks', 'info');
        let to = this.conf.server.html + '/static';
        let rootDir = this.conf.server.base + 'backend/static/';
        symlinkSync(rootDir, to);

        to = this.conf.server.html + '/uploads';
        rootDir = this.conf.server.base + 'backend/static/uploads/';
        fs.readdirSync(rootDir, { recursive : true });
        symlinkSync(rootDir, to);

        to = this.conf.server.html + '/u';
        rootDir = this.conf.server.base + 'backend/static/u/';
        fs.readdirSync(rootDir, { recursive : true });
        symlinkSync(rootDir, to);

        to = this.conf.server.html + '/webfonts';
        rootDir = this.conf.server.base + 'backend/static/webfonts/';
        fs.readdirSync(rootDir, { recursive : true });
        symlinkSync(rootDir, to);

        to = this.conf.server.html + '/tinymce';
        rootDir = this.conf.server.base + "node_modules/tinymce/";
        symlinkSync(rootDir, to);

        to = this.conf.server.html + '/flatpickr';
        rootDir = this.conf.server.base + "node_modules/flatpickr/dist";
        symlinkSync(rootDir, to);

        to = this.conf.server.html + '/chartjs';
        rootDir = this.conf.server.base + "node_modules/chart.js/dist";
        symlinkSync(rootDir, to);

        done();
    };

    loadDatabase(done) {
        const dbinit = () =>  {
            log('Database', 'Initializing database if not initialized', 'info');
            db.initDatabase(this.conf, (err) => {
                log('Database', 'Firing Database init signal', 'success');
                dbconn();
            });
        };

        const dbconn = () => {
            log('Database', 'Requesting dynamic connection object', 'info');
            db.createPool(this.conf, () =>  {
                log('Database', 'Firing Database connection signal', 'success');
                if (!isElder) { return done(); }

                createIndices();
            });
        };

        const createIndices = () => {
            log('Database', 'Creating indices', 'info');
            db.createIndex(this.conf, "content", {title : 'text', content : 'text', subtitle : 'text'}, () => {
                db.createIndex(this.conf, "styledpages", {slug : 1}, () => {
                    db.createIndex(this.conf, "content", {date : 1}, () => {
                        db.createIndex(this.conf, "content", {date : -1}, () => {
                            db.createIndex(this.conf, 'entities', {username : "text", displayname : "text", email : "text"}, () => {
                                log('Database', 'Created indices', 'success');
                                done();
                            });
                        });
                    });
                });
            });
        };

        db.testConnection(this.conf, (err) => {
            hooks.fire('dbtest', err);
            dbinit();
        });
    };

    update(conf, done) {
        if (!isElder || global.__TEST) { return done(); }

        log('Sites', "Checking for updates");
        const versions = require('../updates/versions.json');
        db.findToArray(conf, 'lilium', {}, (err, dbv) => {
            let vIndex = -1;
            let dbvo = {};
            for (let i = 0; i < dbv.length; i++) {
                dbvo[dbv[i].v] = dbv[i];
            }

            const allVersions = Object.keys(versions);
            const checkNextVersion = () => {
                vIndex++;
                if (vIndex == allVersions.length) {
                    log("Sites", "Done updating Lilium", "lilium");
                    done();
                } else {
                    const databaseVersion = allVersions[vIndex];
                    if (dbvo[databaseVersion]) {
                        checkNextVersion();
                    } else {
                        const vinfo = versions[allVersions[vIndex]];
                        vinfo.v = allVersions[vIndex];

                        log("Sites", "Firing update script for version " + vinfo.v, "info");
                        require('../updates/' + vinfo.script)(conf, () => {
                            log("Sites", "Updated to version " + vinfo.v, "success");
                            db.insert(conf, 'lilium', vinfo, checkNextVersion);
                        });
                    }
                }
            };

            checkNextVersion();
        });
    };

    loadTheme(cb) {
        log('Sites', "About to load the theme files for " + this.conf.website.sitetitle, 'info');
        themes.initializeSite(this.conf, () => cb());
    };



    loadSessions(cb) {
        if (!isElder) { return cb(); }
        roles.loadRolesInCache(() => {
            sessions.initSessionsFromDatabase(this.conf, () => {
                require('../pipeline/api.js').loadSessionsInCache(cb);
            });
        });
    };

    checkForWP(conf) {
        if (isElder && conf.wptransferring) {
            log('Sites', 'Resuming Wordpress transfer for site ' + conf.id);
            siteobj.wptransfer(undefined, conf.wpdb, true);
        }
    };

    loadRobots(conf, cb) {
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

    initialize(done) {
        log('Sites', 'Initializing site with id ' + this.conf.id, 'lilium');

        const compileKey = "lml" + Math.random().toString().substring(2) + Math.random().toString().substring(2);
        this.conf.compilekey = compileKey;

        if (global.liliumenv.caij) {
            log.setLevels(["err", "warn", "lilium"]);
        } else if (this.conf.env == "prod") {
            log.setLevels(["err", "warn", "lilium"]);
        } else if (this.conf.env == "dev") {
            log.setLevels(["success", "detail", "live", "err", "warn", "info", "lilium"]);
        } else if (this.conf.env == "output") {
            log.setLevels(["none", "info", "success", "detail", "live", "err", "warn", "lilium"]);
        }

        hooks.fireSite(this.conf, 'site_will_initialize', {});
        endpoints.addSite(this.conf.id);
        analytics.addSite(this.conf);
        adslib.registerSite(this.conf.id);

        this.loadHTMLStructure(() => {
            this.loadStaticSymlinks(() => {
                this.loadDatabase(() => {
                    log('Sites', 'Initializing email senders', 'info');
                    if (/*isElder &&*/ this.conf.emails) {
                        mail.setSender(this.conf.id, {
                            user : this.conf.emails.senderemail,
                            pass : this.conf.emails.senderpass,
                            from : this.conf.emails.senderfrom
                        });
                    }

                    if (this.conf.autositemap && isElder && (global.liliumenv.mode != "script" || global.liliumenv.caij)) {
                        sitemap.scheduleCreation(this.conf, true);
                    }

                    if (isElder) {
                        log('Sites', "Loading polling for elder child", 'info');
                        analytics.pollRealtime(this.conf);
                    }

                    if (isElder) {
                        log('Sites', 'V4 will load all older URL in cache front', 'info');
                        const V4 = require('./v4');
                        const v4 = new V4();
                        v4.dumpV3UrlInFront(this.conf, () => {
                            log('Sites', 'Old URLs will now redirect to new version', 'success');
                        });

                        v4.makeAppMainDependency(this.conf);

                        const buildLib = require('../make/build');   
                        const cssBuildLib = require('../make/cssbuilder'); 
                        const pathLib = require('path');

                        const fs = require('fs');

                        buildLib.pushToBuildTree(this.conf, 'lilium', 'lilium', {
                            outputpath : pathLib.join(this.conf.server.html, 'lmlbackend'),
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

                        this.v4devserver = new V4DevServer(this.conf);
                        this.v4devserver.start();
                    }

                    this.loadTheme(() => {
                        if (global.liliumenv.mode == "script" || global.liliumenv.caij) {
                            return done();
                        }

                        this.loadSessions(() => {
                            this.loadRobots(this.conf, () => {
                                this.update(this.conf, () => {
                                    sharedcache.hi();

                                    this.checkForWP(this.conf);
                                    hooks.fire('site_initialized', this.conf);
                                    log('Sites', 'Initialized site with id ' + this.conf.id, 'success');
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

class Sites {
    wptransfer(cli, dat, noredir) {
        dat = cli ? cli.postdata.data : dat;

        const existingSite = dat.originalsite;

        // cli.did('sites', 'wptransfer', dat);
        log('Sites', 'Initiating Wordpress website transfer');
        if (existingSite && existingSite != "") {
            log('Sites', 'Transferring Wordpress data to site with uid ' + existingSite);
            const Configs = require('./config');
            const siteConf = Configs.fetchConfig(existingSite);
            siteConf.wptransferring = true;
            siteConf.wpdb = dat;
            if (!siteConf.wordpress) {
                siteConf.wordpress = {};
            }

            siteConf.wordpress.originalurl = dat.originalurl || "";
            siteConf.wordpress.wpuploadslocaldir = dat.wpuploadslocaldir || "";

            require('../includes/wpSQL.js').transfer(siteConf.id, dat, (err) => {
                log('Sites', 'Transfer in process');
                if (err) {
                    log('Sites', 'Error while transferring site with uid ' + existingSite + ' : ' + err);
                    if (!noredir) cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
                } else {
                    log('Sites', 'No error detected so far for Wordpress transfer to site with uid ' + existingSite);

                    Configs.saveConfigs(siteConf, () => {
                        log('Sites', 'Redirecting client to sites list');
                        if (!noredir) cli.redirect(cli._c.server.url + "/admin/sites/", false);
                    });
                }
            });
        } else {
            log('Sites', 'Creation of Lilium website', 'lilium');
            db.testConnectionFromParams(dat.dbhost, dat.dbport, dat.dbuser, dat.dbpass, dat.dbname, (success, err) => {
                if (success) {
                    db.testConnectionFromParams(
                        dat.wpsitedataurl, 
                        dat.wpsitedataport, 
                        dat.wpsitedatauser, 
                        dat.wpsitedatapwd, 
                        dat.wpsitedataname, 
                    (success, err) => {
                        if (success) {
                            dat.wptransfer = true;
                        
                            if (!existingSite || existingSite == '') {
                                cli.redirect(cli_c.server.url + "admin/sites/", false);
                                return;
        
                                this.createSite(cli, dat, () => {
                                    log('Sites', 'Site was created. Beginning Wordpress migration.', 'success');
                                    
                                    require('../includes/wpdump.js').dump(cli, {
                                        
                                    }, () => {
    
                                    });
    
                                    cli.redirect(cli._c.server.url + "admin/sites/", false);
                                }); 
                            } else {
                                require('../includes/wpSQL.js').transfer(existingSite, dat, (err) => {
                                    if (err) {
                                        cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
                                    } else {
                                        const siteConf = require('./config').fetchConfig(existingSite);
                                        siteConf.wptransferring = true;
                                        siteConf.wpdb = dat;
    
                                        siteConf.saveConfigs(siteConf, () => {
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

    createSite(cli, postdata, done) {
        const conf = require('../config.js.dist');
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

        const filename = postdata.baseurl.replace(/\/\//g, '').replace(/\//g, ' ');
        const ws = fs.createWriteStream(liliumroot + "/sites/" + filename + ".json", {
            flags: 'w+',
            defaultEncoding: 'utf8'
        });

        ws.write(JSON.stringify(conf.default), 'utf8', () => {
            ws.end();
            config.registerConfigs(conf.default.id, conf.default);

            this.initializeWebsite(conf.default, () => {
                this.precompile(done);
            });
        });
    };

    initializeWebsite(conf, callback) {
        new SiteInitializer(conf).initialize(callback);
    };

    loopPrecomp(done) {
        const s = _cachedSites;
        const  len = s.length;
        let index = 0;

        log("Sites", "Precompiling static files", 'info');
        let now = Date.now();
        const execPreComp = () => {
            if (index === len) {
                const later = Date.now() - now;
                log('Sites', 'Precompiled static files in ' + later + "ms", "info");
                done();
            } else {
                (new SiteInitializer(s[index])).precompile(() => {
                    index++;
                    execPreComp();
                });
            }
        };
        execPreComp();
    };

    loadSites(cb) {
        log('Sites', 'Reading sites directory for websites configurations', 'info');
        fs.readdir(liliumroot + "/sites/", (err, files) => {
            files = files.filter(x => x.endsWith('.json'));
            files.unshift(files.splice(files.indexOf('default.json'), 1)[0]);
            log('Sites', 'Found ' + files.length + ' sites', 'info');

            let fileIndex = 0;
            const nextFile = () => {
                if (fileIndex == files.length) {
                    cb();
                } else {
                    let sitename = files[fileIndex].replace('.json', '');
                    log('Sites', 'Loading config for website ' + sitename, 'lilium');

                    const siteInfo = require(liliumroot + "/sites/" + files[fileIndex]);
                    const keyname = sitename.replace('//', '').replace(/\s/g, '/');
                    siteInfo.jsonfile = files[fileIndex];

                    if (!siteInfo.server.base) {
                        siteInfo.server.base = liliumroot + "/";
                    }
                    if (!siteInfo.server.html) {
                        siteInfo.server.html = require('path').join(liliumroot, "html");
                    }

                    config.registerConfigs(keyname, siteInfo);
                    if (sitename == 'default') {
                        const urlbase = siteInfo.server.url.replace('//', '').replace(/\s/g, '/');
                        config.registerConfigs(urlbase, siteInfo);
                    }

                    // Convenience props
                    siteInfo.server.fullurl = (siteInfo.server.protocol || "http:") + siteInfo.server.url;

                    _cachedSites.push(siteInfo);
                    fileIndex++;
                    this.initializeWebsite(config.fetchConfig(keyname), nextFile);
                }
            };
            nextFile();
        });
    };

    getSites() {
        return _cachedSites;
    };
};

module.exports = new Sites();
