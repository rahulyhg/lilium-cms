var fs = require('fs');
var _c = require('./config.js');
var fileserver = require('./fileserver.js');
var filelogic = require('./filelogic.js');
var log = require('./log.js');
var Admin = require('./backend/admin.js');
var db = require('./includes/db.js');
var livevars = require('./livevars.js');
var cli = require('./cli.js');
var pathLib = require('path');

var ActiveTheme = new Object();
var CachedThemes = new Array();
var ThemeSnips = new Object();

var Themes = function () {
    var that = this;

    this.registerThemeSnip = function(conf, snipid, callback) {
        var cTheme = that.getEnabledTheme(conf);

        if ('undefined' === typeof ThemeSnips[conf.id]) {
            ThemeSnips[conf.id] = new Object();
        }

        ThemeSnips[conf.id][snipid] = {
            id : snipid,
            theme : cTheme,
            site : conf.id,
            exec : callback
        };
    };

    // Params are undeclared, but are to be passed.
    // Function is executed sync, and returns mark up as string. 
    this.renderSnip = function(conf, snipid, params) {
        if (ThemeSnips[conf.id] && ThemeSnips[conf.id][snipid]) {
            return ThemeSnips[conf.id][snipid].exec.apply(ThemeSnips[conf.id][snipid], params);
        } else {
            return "[ThemeSnipException] No snippet found with id " + snipid + " on website " + conf.id;
        }
    };

    this.adminPOST = function(cli) {
        if (cli.hasRightOrRefuse("manage-themes")) {
            if (cli.routeinfo.path.length > 2 && cli.routeinfo.path[2] == "enableTheme") {
                that.enableTheme(cli._c, cli.postdata.data.uName, function () {
                    cli.sendJSON({
                        success: true
                    });
                });
            } else if (cli.routeinfo.path[2] == "updateOneField") {
                this.updateOneField(cli._c, cli.postdata.data.field, cli.postdata.data.value, () => {

                });
            } else {
                cli.throwHTTP(403, undefined, true);
            }
        } 
    };

    this.adminGET = function (cli) {
        cli.touch("themes.adminGET");
        
        if (cli.hasRightOrRefuse("manage-themes")) {
            if (cli.routeinfo.path.length > 2 && cli.routeinfo.path[2] == "enableTheme") {
                that.enableTheme(cli._c, cli.postdata.data.uName, function () {
                    cli.sendJSON({
                        success: true
                    });
                });
            } else {
                filelogic.serveAdminLML(cli);
            }
        }
    };

    this.getCachedThemes = function () {
        return CachedThemes;
    };

    this.updateThemeSettings = function (cli) {
        if (cli.postdata.data) {
            db.update(cli._c, 'themes', {uName : ActiveTheme[cli._c.id].uName}, {settings : cli.postdata.data}, function(err, res) {
                if (err) throw new Error("[ThemeException] Error while updating theme settings " + err);
                ActiveTheme[cli._c.id].settings = cli.postdata.data;
                cli.refresh();
            });
        } else {
            cli.refresh();
        }
    }

    this.updateOneField = function(_c, field, value, done) {
        db.update(_c, 'themes', { active : true }, { ["settings." + field] : value }, (err, res) => {
            done();
        });
    }

    this.searchDirForThemes = function (uName, callback) {
        this.getThemesDirList(_c.default(), function (list) {
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

    this.getThemesDirList = function (conf, callback) {
        var themedir = conf.server.base + conf.paths.themes + "/";
        fs.readdir(themedir, function (err, dirs) {
            if (err) {
                throw new Error("[ThemeException] Could not access theme directory : " + err);
            }

            var allThemes = new Array();

            var i = -1;
            nextDir = function () {
                i++;
                if (i >= dirs.length) {
                    CachedThemes = allThemes;
                    callback(allThemes)
                } else {
                    var infoPath = themedir + dirs[i] + "/" + conf.paths.themesInfo;
                    fileserver.fileExists(infoPath, function (exists) {
                        if (exists) {
                            fileserver.readJSON(infoPath, function (json) {
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

    this.isActive = function (conf, uName) {
        return typeof uName !== 'undefined' && ActiveTheme[conf.id] && ActiveTheme[conf.id].uName == uName;
    };

    this.enableTheme = function (config, uName, callback, curSettings) {
        if (this.isActive(config, uName)) {
            var err = new Error("[ThemeException] Cannot register already registered theme with uName " + uName);
            log('Themes', err);
            callback(err);
        } else {
            log('Themes', 'Registering theme with uName ' + uName);
            this.searchDirForThemes(uName, function (info) {
                if (!info) {
                    throw new Error("[ThemeException] Could not find any info on theme with uName " + uName);
                }

                var themedir = config.server.base + config.paths.themes + "/";
                var ThemeClass = require(themedir + info.dirName + "/" + info.entry);
                var ThemeInstance = new ThemeClass();

                if (typeof ActiveTheme[config.id] !== 'undefined') {
                    db.update(config, 'themes', {
                        uName: ActiveTheme[config.id].uName
                    }, {
                        active: false
                    });
                }

                ActiveTheme[config.id] = ThemeInstance;

                info.active = true;
                info.path = info.dirName;
                ActiveTheme[config.id].uName = info.uName;
                ActiveTheme[config.id].info = info;

                // Register Settings for theme
                log('Themes', 'Updating Settings form');
                var settings = createOrUpdateThemeForm(config);
                log('Themes', 'Updating database entry for site : ' + config.id);

                db.findAndModify(config, 'themes', {
                    uName: uName
                }, info, function (err, doc) {
                    log('Themes', 'Enabling theme ' + info.uName);
                    try {
                        ThemeInstance.enable(config, info, function() {
                            if (!doc.value) {
                                db.update(config, 'themes', {
                                    uName: uName
                                }, { settings : settings}, function() {
                                    ActiveTheme[config.id].settings = curSettings || settings;
                                    callback();
                                });

                            } else {
                                ActiveTheme[config.id].settings = curSettings || doc.value.settings || ActiveTheme[config.id].settings;
    
                                log('Themes', 'Theme enable called back');
                                cli.cacheClear(undefined, callback);
                            }
                        });
                    } catch(e) {
                        console.log(e);
                    }
                }, true, true);

            });
        }
    };

    var createOrUpdateThemeForm = function (config) {
        var defaults = {};

        log("Themes", "Updated setting form")
        return defaults;
    };

    this.getSettings = function(config) {
        return ActiveTheme[config.id || config].settings;
    }

    this.getEnabledTheme = function (config) {
        return ActiveTheme[config.id || config];
    };

    this.fetchCurrentTheme = function(config, cb) {
        db.find(config, 'themes', {active : true}, [], function(err, cur) {
            cur.next(function(err, th) {
                cb(th);
            });
        });
    };

    this.getEnabledThemePath = function (config) {
        return config.server.base + config.paths.themes + '/' + ActiveTheme[config.id].info.dirName;
    }

    this.getEnabledThemeEntry = function(config) {
        return this.getEnabledThemePath(config) + '/' + this.getEnabledTheme(config).info.entry;
    };

    this.debug = function() {
        console.log(ActiveTheme);
    };

    this.livevar = function (cli, levels, params, callback) {
        if (levels[0] == "all") {
            fs.readdir(pathLib.join(liliumroot, 'flowers'), (err, dirs) => {
                if (err || dirs.length == 0) {
                    callback([]);
                } else {
                    let index = -1;
                    const themes = [];

                    const nextJSON = () => {
                        const dir = dirs[++index];
                        if (!dir) {
                            callback(themes);
                        } else {
                            fs.readFile(pathLib.join(liliumroot, 'flowers', dir, "info.json"), (err, json) => {
                                if (json) {
                                    themes.push(JSON.parse(json));  
                                } 

                                nextJSON();
                            });
                        }
                    };

                    nextJSON();
                }
            });
        } else if (levels[0] == "current") {
            db.findUnique(cli._c, 'themes', { active : true }, (err, t) => callback(t));
        } else {
            callback();
        }
    };

    this.initializeSite = function (conf, cb) {
        that.getThemesDirList(conf, function (themes) {
            db.findToArray(conf.id, 'themes', {
                'active': true
            }, function (err, results) {
                var remove = function () {            
                    db.remove(conf, 'themes', {$or : [{'active':false}, {'active': null}]}, function () {
                        db.insert(conf, 'themes', themes, function (err) {
                            cb();
                        });
                    }, false);
                };

                if (results.length == 0) {
                    for (var i in themes) {
                        if (themes[i].uName == conf.website.flower) {
                            themes[i].active = true;

                            themes.splice(i, 1);

                            that.enableTheme(conf, conf.website.flower, remove);
                            break;
                        }
                    }
                } else {
                    var curt = results[0]
                    for (var j in themes) {
                        if (curt.uName == themes[j].uName) {
                            themes[j].active = true;
                            themes.splice(j, 1);
                            that.enableTheme(conf, curt.uName, function() {
                                remove();
                            }, curt.settings);
                            return;
                        }
                    }
                }
            });
        });
    };
};

module.exports = new Themes();
