const fs = require('fs');
const _c = require('../lib/config');
const db = require('./db.js');
const hooks = require('./hooks');

const pathLib = require('path');

let ActiveTheme = {};
let CachedThemes = [];
let ThemeSnips = {};

class Themes {
    registerThemeSnip(conf, snipid, callback) {
        const cTheme = this.getEnabledTheme(conf);

        if ('undefined' === typeof ThemeSnips[conf.id]) {
            ThemeSnips[conf.id] = {};
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
    renderSnip(conf, snipid, params) {
        if (ThemeSnips[conf.id] && ThemeSnips[conf.id][snipid]) {
            return ThemeSnips[conf.id][snipid].exec.apply(ThemeSnips[conf.id][snipid], params);
        } else {
            return "[ThemeSnipException] No snippet found with id " + snipid + " on website " + conf.id;
        }
    };

    getCachedThemes() {
        return CachedThemes;
    };

    updateThemeSettings(cli) {
        if (cli.postdata.data) {
            db.update(cli._c, 'themes', {uName : ActiveTheme[cli._c.id].uName}, {settings : cli.postdata.data}, (err, res) => {
                if (err) throw new Error("[ThemeException] Error while updating theme settings " + err);
                ActiveTheme[cli._c.id].settings = cli.postdata.data;
                cli.refresh();
            });
        } else {
            cli.refresh();
        }
    }

    overwriteSettings(_c, settings, done) {
        db.update(_c, 'themes', {uName : settings.theme}, { settings : settings.data }, err => {
            done(err);
        });
    }

    updateOneField(_c, lang, field, value, done) {
        const allowedfields = this.getEnabledTheme(_c).info.settingForm || {};
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

    searchDirForThemes(uName, callback) {
        this.getThemesDirList(_c.default(), (list) => {
            let themeInfo = undefined;

            for (let i = 0; i < list.length; i++) {
                if (list[i].uName == uName) {
                    themeInfo = list[i];
                    break;
                }
            }
            callback(themeInfo);
        });
    };

    getThemesDirList(conf, callback) {
        const themedir = require('path').join(liliumroot, 'flowers');
        fs.readdir(themedir, (err, dirs) => {
            if (err) {
                throw new Error("[ThemeException] Could not access theme directory : " + err);
            }

            let allThemes = [];

            let i = -1;
            const nextDir = () => {
                i++;
                if (i >= dirs.length) {
                    CachedThemes = allThemes;
                    callback(allThemes)
                } else {
                    const infoPath = require('path').join(themedir, dirs[i], "info.json");
                    fs.stat(infoPath, (err, s) => {
                        if (!err) {
                            const json = require(infoPath);
                            json.dirName = dirs[i];
                            allThemes.push(json);
                            nextDir();
                        } else {
                            nextDir();
                        }
                    });
                }
            };

            nextDir();
        });
    };

    isActive(conf, uName) {
        return typeof uName !== 'undefined' && ActiveTheme[conf.id] && ActiveTheme[conf.id].uName == uName;
    };

    enableTheme(config, uName, callback, curSettings) {
        if (this.isActive(config, uName)) {
            const err = new Error("[ThemeException] Cannot register already registered theme with uName " + uName);
            log('Themes', err);
            callback(err);
        } else {
            log('Themes', 'Registering theme with uName ' + uName);
            this.searchDirForThemes(uName, (info) => {
                if (!info) {
                    return callback(new Error("[ThemeException] Could not find any info on theme with uName " + uName));
                }

                const themedir = require('path').join(liliumroot, 'flowers');
                const ThemeClass = require(require('path').join(themedir, info.dirName, info.entry));
                const ThemeInstance = new ThemeClass();

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
                let settings = this.createOrUpdateThemeForm(config);
                log('Themes', 'Updating database entry for site : ' + config.id);

                db.update(config, 'themes', {
                    uName: uName
                }, info, (err, doc) => {
                    log('Themes', 'Enabling theme ' + info.uName);
                    try {
                        ThemeInstance.enable(config, info, () => {
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

    createOrUpdateThemeForm(config) {
        const defaults = {};

        log("Themes", "Updated setting form")
        return defaults;
    };

    getSettings(config) {
        return ActiveTheme[config.id || config].settings;
    }

    getEnabledTheme(config) {
        return ActiveTheme[config.id || config];
    };

    fetchCurrentTheme(config, cb) {
        db.find(config, 'themes', {active : true}, [], (err, cur) => {
            cur.next((err, th) => {
                cb(th);
            });
        });
    };

    getEnabledThemePath(config) {
        return require('path').join(liliumroot, 'flowers', ActiveTheme[config.id].info.dirName);
    }

    getEnabledThemeEntry(config) {
        return this.getEnabledThemePath(config) + '/' + this.getEnabledTheme(config).info.entry;
    };

    debug() {
        console.log(ActiveTheme);
    };

    initializeSite(conf, cb, ignoreSiteTheme) {
        this.getThemesDirList(conf, (themes) => {
            db.findUnique(conf.id, 'themes', {
                'active': true
            }, (err, theme) => {
                if (!theme || ignoreSiteTheme) {
                    log('Theme', 'No theme registered for website ' + conf.website.sitetitle, 'err');
                    log('Theme', 'Trying to fallback to any theme present', 'info');

                    const info = themes[0]
                    if (info) {
                        this.enableTheme(conf, info.uName, err => {
                            if (err) {
                                log('Theme', '[FATAL] Error registering default theme', 'err');
                                require('../network/localcast').fatal(err);
                            } else {
                                cb()
                            }
                        }, {});
                    } else {
                        log('Theme', '[FATAL] No theme found in /flowers directory', 'err');
                        require('../network/localcast').fatal(new Error("Lilium requires at least one theme located under /flowers"));
                    }
                } else {
                    this.enableTheme(conf, theme.uName, err => {
                        if (err) {
                            log('Theme', err.toString(), 'err');
                            log('Theme', 'Trying to fallback to another theme if any', 'info');
                            this.initializeSite(conf, cb, true);
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
