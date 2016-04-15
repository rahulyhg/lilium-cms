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
var Themes = function () {
    var that = this;

    this.serveAdminList = function (cli) {
        cli.touch("themes.serveAdminList");
        if (cli.routeinfo.path.length == 2 && cli.method == 'POST') {
            that.updateThemeSettings(cli);
        } else if (cli.routeinfo.path.length > 2 && cli.routeinfo.path[2] == "enableTheme") {
            that.enableTheme(cli.postdata.data.uName, function () {
                cli.sendJSON({
                    success: true
                });
            });
        } else {
            filelogic.serveAdminLML(cli);
        }

    };

    this.getCachedThemes = function () {
        return CachedThemes;
    };

    this.updateThemeSettings = function (cli) {
        var form = formBuilder.handleRequest(cli);
        var formData = formBuilder.serializeForm(form);

        if (formData) {
            db.update(cli._c, 'themes', {uName : ActiveTheme.uName}, {settings : formData}, function(err, res) {
                if (err) throw new Error("[ThemeException] Error while updating theme settings " + err);
                cli.refresh();
            });
        } else {
            cli.refresh();
        }
    }

    this.searchDirForThemes = function (uName, callback) {
        this.getThemesDirList(function (list) {
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

    this.getThemesDirList = function (callback) {
        var themedir = _c.default().server.base + _c.default().paths.themes + "/";
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
                    var infoPath = themedir + dirs[i] + "/" + _c.default().paths.themesInfo;
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

    this.isActive = function (uName) {
        return typeof uName !== 'undefined' && ActiveTheme.uName == uName;
    };

    this.enableTheme = function (uName, callback) {
        if (this.isActive(uName)) {
            throw new Error("[ThemeException] Cannot register already registered theme with uName " + uName);
        } else {
            log('Themes', 'Registering theme with uName ' + uName);
            this.searchDirForThemes(uName, function (info) {
                if (!info) {
                    throw new Error("[ThemeException] Could not find any info on theme with uName " + uName);
                }

                var themedir = _c.default().server.base + _c.default().paths.themes + "/";
                var ThemeInstance = require(themedir + info.dirName + "/" + info.entry);
                if (typeof ActiveTheme !== 'undefined') {
                    db.update(_c.default(), 'themes', {
                        uName: ActiveTheme.uName
                    }, {
                        active: false
                    });
                }

                ActiveTheme = ThemeInstance;

                info.active = true;
                info.path = info.dirName;
                ActiveTheme.uName = info.uName;
                ActiveTheme.info = info;

                // Register Settings for theme
                log('Themes', 'Updating Settings form');
                createOrUpdateThemeForm();

                db.update(_c.default(), 'themes', {
                    uName: uName
                }, info, function () {

                    ThemeInstance.enable(_c, info, function() {
                        cli.cacheClear();
                        callback();
                    });

                }, true, true);

            });
        }
    };

    var createOrUpdateThemeForm = function () {
        if (formBuilder.isAlreadyCreated('theme_settings')) {
            formBuilder.deleteForm('theme_settings');
        }
        if (ActiveTheme.info.settingForm) {
            var form = formBuilder.createForm('theme_settings');
            form.add('formsetting-sep', 'title', {displayname : 'Theme Settings (' + ActiveTheme.info.uName + ')'} );

            for (var name in ActiveTheme.info.settingForm) {
                var property = ActiveTheme.info.settingForm[name];
                if (property.type == 'submit') {
                    throw new Error('[Themes] - ILLEGAL form type "submit" for theme settings form.')
                }
                form.add(name, property.type, property.attr || {} );
            }
            form.add('Submit', 'submit', {displayname : 'Update Settings'} );

        }


    };

    this.getSettings = function() {
        return ActiveTheme.settings;
    }

    this.getEnabledTheme = function () {
        return ActiveTheme;
    };

    this.getEnabledThemePath = function () {
        return _c.default().server.base + _c.default().paths.themes + '/' + ActiveTheme.info.dirName;
    }


    this.bindEndpoints = function () {
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

        livevars.registerLiveVariable('theme_settings', function (cli, levels, params, callback) {
            db.findToArray(cli._c, 'themes', {uName : ActiveTheme.uName}, function(err, arr) {
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

    this.init = function (cb) {
        this.registerForm();
        that.getThemesDirList(function (themes) {
            db.findToArray(_c.default(), 'themes', {
                'active': true
            }, function (err, results) {

                var remove = function () {
                    db.remove(_c.default(), 'themes', {$or : [{'active':false}, {'active': null}]}, function () {
                        db.insert(_c.default(), 'themes', themes, function (err) {
                            cb();
                        });
                    }, false);
                };

                if (results.length == 0) {
                    for (var i in themes) {
                        if (themes[i].uName == _c.default().website.flower) {
                            themes[i].active = true;
                            that.enableTheme(_c.default().website.flower, remove);
                            break;
                        }
                    }

                } else {

                    for (var i in results) {

                        for (var j in themes) {
                            if (results[i].uName == themes[j].uName) {
                                themes[j].active = true;
                                that.enableTheme(results[i].uName, remove);
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
