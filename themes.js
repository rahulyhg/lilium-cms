var fs = require('fs');
var _c = require('./config.js');
var fileserver = require('./fileserver.js');
var filelogic = require('./filelogic.js');
var log = require('./log.js');
var Admin = require('./backend/admin.js');
var db = require('./includes/db.js');
var livevars = require('./livevars.js');
var tableBuilder = require('./tableBuilder.js');
var formBuilder = require('./formBuilder.js');
var cli = require('./cli.js');

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

    this.serveAdminList = function (cli) {
        cli.touch("themes.serveAdminList");
        
        if (cli.hasRightOrRefuse("manage-themes")) {
            if (cli.routeinfo.path.length == 2 && cli.method == 'POST') {
                that.updateThemeSettings(cli);
            } else if (cli.routeinfo.path.length > 2 && cli.routeinfo.path[2] == "enableTheme") {
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
        var form = formBuilder.handleRequest(cli);
        var formData = formBuilder.serializeForm(form);

        if (formData) {
            db.update(cli._c, 'themes', {uName : ActiveTheme[cli._c.id].uName}, {settings : formData}, function(err, res) {
                if (err) throw new Error("[ThemeException] Error while updating theme settings " + err);
                ActiveTheme[cli._c.id].settings = formData;
                cli.refresh();
            });
        } else {
            cli.refresh();
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

    this.enableTheme = function (config, uName, callback) {
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
                var ThemeInstance = require(themedir + info.dirName + "/" + info.entry);
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
                                    ActiveTheme[config.id].settings = settings;
                                });
                                callback();

                            } else {
                                ActiveTheme[config.id].settings = doc.value.settings || ActiveTheme[config.id].settings;
    
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
        var formName = 'theme_settings_' + config.uid;

        if (ActiveTheme[config.id].info.settingForm) {
            ActiveTheme[config.id].settings = {};

            formBuilder.deleteForm();
            if (!formBuilder.isAlreadyCreated(formName)) {
                var form = formBuilder.createForm(formName, {
                    fieldWrapper: {
                        tag: 'div',
                        cssPrefix: 'theme-setting-field-'
                    },
                    cssClass: 'theme-settings-form'
                });
                form.add('formsetting-sep', 'title', {
                    displayname : 'Theme Settings (' + ActiveTheme[config.id].info.uName + ')'
                } );
            }

            for (var name in ActiveTheme[config.id].info.settingForm) {
                var property = ActiveTheme[config.id].info.settingForm[name];
                if (property.type == 'submit') {
                    throw new Error('[Themes] - ILLEGAL form type "submit" for theme settings form.')
                }

                if (!property.default) {
                    throw new Error('[Themes] - The field "' + name + '" has no default value.');
                }
                defaults[name] = property.default;

                ActiveTheme[config.id].settings[name] = property.default;
                form.add(name, property.type, property.attr || {} );
            }

            form.add('Submit', 'submit', {displayname : 'Update Settings'} );
            
            return defaults;
        }

        log("Themes", "Updated setting form")
    };

    this.getSettings = function(config) {
        return ActiveTheme[config.id || config].settings;
    }

    this.getEnabledTheme = function (config) {
        return ActiveTheme[config.id || config];
    };

    this.getEnabledThemePath = function (config) {
        return config.server.base + config.paths.themes + '/' + ActiveTheme[config.id].info.dirName;
    }

    this.getEnabledThemeEntry = function(config) {
        return this.getEnabledThemePath(config) + '/' + this.getEnabledTheme(config).info.entry;
    };

    this.bindEndpoints = function (conf) {
        Admin.registerAdminEndpoint('themes', 'GET', this.serveAdminList);
        Admin.registerAdminEndpoint('themes', 'POST', this.serveAdminList);
    };

    this.registerLiveVar = function () {
        livevars.registerLiveVariable('theme', function (cli, levels, params, callback) {
            var allThemes = levels.length === 0;
            if (allThemes) {
                db.singleLevelFind(cli._c, 'themes', callback);
            } else if (levels[0] == 'table') {
                var sort = {};
                sort[typeof params.sortby !== 'undefined' ? params.sortby : '_id'] = (params.order || 1);
                db.aggregate(cli._c, 'themes', [{
                    $match:
                        (params.search ? {
                            $text: {
                                $search: params.search
                            }
                        } : {})

                }, {
                    $sort: sort
                }, {
                    $skip: (params.skip || 0)
                }, {
                    $limit: (params.max || 20)
                }], function (data) {
                    db.find(cli._c, 'themes', (params.search ? {
                        $text: {
                            $search: params.search
                        }
                    } : {}), [], function (err, cursor) {

                        cursor.count(function (err, size) {
                            results = {
                                size: size,
                                data: data
                            }
                            callback(err || results);

                        });
                    });
                });
            } else {
                db.multiLevelFind(cli._c, 'themes', levels, {
                    uName: (levels[0])
                }, {
                    limit: [1]
                }, callback);
            }
        }, ["themes"]);

        livevars.registerLiveVariable('themesettings', function (cli, levels, params, callback) {
            db.findToArray(cli._c, 'themes', {uName : ActiveTheme[cli._c.id].uName}, function(err, arr) {
                callback(err || arr[0].settings);
            });
        });
    };

    this.registerForm = function () {
        tableBuilder.createTable({
            name: 'theme',
            endpoint: 'theme.table',
            paginate: true,
            searchable: true,
            max_results: 10,
            fields: [{
                key: 'dName',
                displayname: 'Name',
                sortable: true
            }, {
                key: '',
                displayname: 'Actions',
                template: 'table-themes-actions',
                sortable: true,
                sortkey: 'active'
            }, {
                key: 'entry',
                displayname: 'Entry Script',
                sortable: true
            }, ]
        });
    };

    this.init = function (conf, cb) {
        this.registerForm();
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

                    for (var i in results) {

                        for (var j in themes) {
                            if (results[i].uName == themes[j].uName) {
                                themes[j].active = true;
                                themes.splice(j, 1);
                                that.enableTheme(conf, results[i].uName, remove);
                                return;
                            }
                        }

                    }

                }
            });



        });

    };


};

module.exports = new Themes();
