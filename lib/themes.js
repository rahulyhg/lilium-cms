const fs = require('fs');
const _c = require('../lib/config');
const db = require('./db.js');
const filelogic = require('../pipeline/filelogic');
const hooks = require('./hooks');

const pathLib = require('path');

let ActiveTheme = {};
let CachedThemes = [];
let ThemeSnips = {};

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

    this.overwriteSettings = (_c, settings, done) => {
        db.update(_c, 'themes', {uName : settings.theme}, { settings : settings.data }, err => {
            done(err);
        });
    }

    this.updateOneField = function(_c, lang, field, value, done) {
        const allowedfields = that.getEnabledTheme(_c).info.settingForm || {};
        const fieldinfo = allowedfields[field];

        if (fieldinfo) {
            const ff = `settings.${lang}.${field}`;
            const payload = {
                lang, field, value
            };
            hooks.fireSite(_c, 'theme_setting_updated', payload); 
            db.update(_c, 'themes', { active : true }, { [ff] : fieldinfo.ref ? db.mongoID(payload.value) : payload.value }, (err, res) => {
                done();
            });
        } else {
            done(false);
        }
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
                    filelogic.fileExists(infoPath, function (exists) {
                        if (exists) {
                            filelogic.readJSON(infoPath, function (json) {
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
                    return callback(new Error("[ThemeException] Could not find any info on theme with uName " + uName));
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

                db.update(config, 'themes', {
                    uName: uName
                }, info, function (err, doc) {
                    log('Themes', 'Enabling theme ' + info.uName);
                    try {
                        ThemeInstance.enable(config, info, function() {
                            if (!doc.value) {
                                ActiveTheme[config.id].settings = curSettings || settings;
                                callback();
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

    this.initializeSite = function (conf, cb, ignoreSiteTheme) {
        that.getThemesDirList(conf, function (themes) {
            db.findUnique(conf.id, 'themes', {
                'active': true
            }, (err, theme) => {
                if (!theme || ignoreSiteTheme) {
                    log('Theme', 'No theme registered for website ' + conf.website.sitetitle, 'err');
                    log('Theme', 'Trying to fallback to any theme present', 'info');

                    const info = themes[0]
                    if (info) {
                        that.enableTheme(conf, info.uName, err => {
                            if (err) {
                                log('Theme', '[FATAL] Error registering default theme', 'err');
                                require('./network/localcast').fatal(err);
                            } else {
                                cb()
                            }
                        }, {});
                    } else {
                        log('Theme', '[FATAL] No theme found in /flowers directory', 'err');
                        require('./network/localcast').fatal(new Error("Lilium requires at least one theme located under /flowers"));
                    }
                } else {
                    that.enableTheme(conf, theme.uName, err => {
                        if (err) {
                            log('Theme', err.toString(), 'err');
                            log('Theme', 'Trying to fallback to another theme if any', 'info');
                            that.initializeSite(conf, cb, true);
                        } else {
                            cb();
                        }
                    }, theme.settings);
                }
            });
        });
    };
};

module.exports = new Themes();
