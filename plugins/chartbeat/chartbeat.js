var log = undefined;
var config = undefined;
var Petal = undefined;
var dashboard = undefined;
var hooks = undefined;
var cacheInvalidator = undefined;
var scheduler = undefined;
var db = undefined;
var request = undefined;
var notifications = undefined;
var livevars = undefined;
var localcast = undefined;

var _toppages = new Array();
var _latestHisto = new Object();

var Chartbeat = function() {
    this.iface = new Object();
    var scheduleFetchID = "chartbeat_fetch_realtime";
    var quickstatsURL = "http://api.chartbeat.com/live/quickstats/v4/?apikey={apikey}&host={host}&section={section}";
    var toppagesURL = "http://api.chartbeat.com/live/toppages/v3/?apikey={apikey}&host={host}&section={section}&types=1";

    var initRequires = function(abspath) {
        log = require(abspath + "log.js");
        config = require(abspath + "config.js");
        Petal = require(abspath + "petal.js");
        dashboard = require(abspath + "dashboard.js");
        hooks = require(abspath + "hooks.js");
        cacheInvalidator = require(abspath + "cacheInvalidator.js");
        scheduler = require(abspath + "scheduler.js");
        db = require(abspath + "includes/db.js")
        notifications = require(abspath + "notifications.js");
        request = require('request');
        livevars = require(abspath + "livevars.js");
        localcast = require(abspath + "localcast.js");
    };

    var createPetals = function() {
        Petal.register('dashboardChartbeat', config.default().server.base + "plugins/chartbeat/dynamic/dash.petal");
        Petal.register('dashboardChartbeatJS', config.default().server.base + "plugins/chartbeat/dynamic/dashjs.petal");
    };

    var hookOnDashboard = function() {
        dashboard.registerDashPetal('dashboardChartbeat', 50);

        hooks.bind('frontend_will_precompile', 5000, function(pkg) {
            log('Chartbeat', 'Registering CSS file to admin context');
            pkg.Frontend.registerCSSFile(
                pkg.config.server.base + "plugins/chartbeat/dynamic/chartbeat.css",
                2550,
                'admin',
                pkg.config.id
            );

            pkg.Frontend.registerJSFile(
                pkg.config.server.base + "plugins/chartbeat/dynamic/gauge.min.js",
                3000,
                'admin',
                pkg.config.id
            );

            pkg.Frontend.registerJSFile(
                pkg.config.server.base + "plugins/chartbeat/countto.js",
                1952,
                'admin',
                pkg.config.id
            );

            pkg.Frontend.registerJSFile(
                pkg.config.server.base + "plugins/chartbeat/chart.js",
                2925,
                'admin',
                pkg.config.id
            );
        });
    };

    var registerSettings = function() {
        hooks.bind('settings_form_bottom', 400, function(pkg) {
            pkg.form.add('chartbeat-sep', 'title', {
                    displayname: "Chartbeat"
                })
                .add('chartbeat.api_key', 'text', {
                    displayname: "API Key"
                }, {
                    required: false
                })
                .add('chartbeat.configuid', 'text', {
                    displayname: "Configuration ID"
                }, {
                    required: false
                })
                .add('chartbeat.host', 'text', {
                    displayname: "Host"
                }, {
                    required: false
                })
                .add('chartbeat.section', 'text', {
                    displayname: "Section (blank if none)"
                }, {
                    required: false
                });
        });

        hooks.bind('settings_saved', 10, function(cli) {
            cacheInvalidator.deleteCachedFile(cli._c, "admin/dashboard/index.html");
        });
    };

    var initDatabase = function(conf, cb) {
        db.createCollection(conf, 'chartbeathisto', cb);
    };

    var initDatabases = function(cb) {
        hooks.bind('site_initialized', 1000, function(conf) {
            initDatabase(conf, function() {});
        });

        config.each(function(conf, next) {
            initDatabase(conf, next);
        }, cb);
    };

    var parseChartbeatJSON = function(resp) {
        try {
            var obj = JSON.parse(resp);
            return obj;
        } catch (err) {
            err.error = err.message;
            return err;
        }
    };

    var registerLiveVar = function() {
        livevars.registerLiveVariable("chartbeat", function(cli, levels, params, send) {
            if (levels.length == 0) {
                send("Undefined root level live variable for Chartbeat")
                return;
            }

            switch (levels[0]) {
                case "dashboard":
                    switch (levels[1]) {
                        case "top":
                            send(_toppages);
                            break;
                        case "latest":
                            send(_latestHisto);
                            break;
                        case "history":
                        default:
                            var limit = params.limit ? parseInt(params.limit) : 100;
                            db.find(cli._c, 'chartbeathisto', {}, {}, function(err, cur) {
                                if (!err) {
                                    cur.sort({
                                        "_id": -1
                                    }).limit(limit).toArray(function(err, dat) {
                                        send(dat);
                                    });
                                } else {
                                    send(err);
                                }
                            });
                            break;
                    }
                    break;
                default:
                    send("Undefined first-level " + levels[0] + " for Chartbeat");
            }
        }, []);
    };

    var storeQuickstats = function(conf, err, resp, body) {
        if (!err) {
            notifications.emitToWebsite(conf.id, body, 'chartbeat_histo');
            var dat = parseChartbeatJSON(body);
            if (!dat.error) {
                var now = new Date();
                if (now.getSeconds() < 5 && (now.getMinutes() % 10 == 0)) {
                    var item = {
                        people: dat.data.stats.people,
                        recirc: dat.data.stats.recirc,
                        at: now
                    };
                    db.insert(conf, 'chartbeathisto', item, function(err, r) {
                        notifications.emitToWebsite(conf.id, item, 'chartbeat_histo_push');
                    });
                }
            } else {
                _latestHisto = dat;
            }
        } else {
            log('Chartbeat', 'Network error : ' + err, 'err');
            return err;
        }
    };

    var storeToppages = function(conf, err, resp, body) {
        if (!err) {
            var dat = parseChartbeatJSON(body);
            if (!dat.error) {
                var arr = new Array();
                for (var i = 0; i < dat.pages.length; i++) {
                    var p = dat.pages[i];
                    var author = p.authors ? p.authors[0] : "";

                    arr.push({
                        url: p.path,
                        author: author == 'none' ? '' : author,
                        people: p.stats.people,
                        title: p.title,
                        google: p.stats.search,
                        social: p.stats.social,
                        refs: p.stats.toprefs,
                        type: p.stats.type,
                        recirc: p.stats.recirc
                    });
                }
                _toppages = arr;
                notifications.emitToWebsite(conf.id, _toppages, 'chartbeat_top');
            }
        } else {
            log("Chartbeat", "Network error : " + err, 'err');
            return err;
        }
    };

    var scheduleInterval = function(conf) {
        if (conf.chartbeat && conf.chartbeat.api_key && conf.chartbeat.host && localcast.isElderChild()) {
            var qsurl = quickstatsURL
                .replace("{apikey}", conf.chartbeat.api_key)
                .replace("{host}", conf.chartbeat.host)
                .replace("{section}", conf.chartbeat.section);

            var tpurl = toppagesURL
                .replace("{apikey}", conf.chartbeat.api_key)
                .replace("{host}", conf.chartbeat.host)
                .replace("{section}", conf.chartbeat.section);

            var scCall = function() {
                var t = new Date();
                request.get(qsurl, {timeout:350}, function(err, resp, body) {
                    storeQuickstats(conf, err, resp, body);

                    if (err) {
                        scheduler.remove(scheduleFetchID + conf.id);
                        setTimeout(function() {
                            scheduler.schedule(scheduleFetchID + conf.id, {
                                every: {
                                    secondCount: 6
                                }
                            }, scCall).start();
                        }, 6000);
                    }
                });

                request.get(tpurl, {timeout:250}, function(err, resp, body) {
                    storeToppages(conf, err, resp, body);
                });
            };

            scheduler.remove(scheduleFetchID + conf.id);
            scheduler.schedule(scheduleFetchID + conf.id, {
                every: {
                    secondCount: 6
                }
            }, scCall).start();

            request(qsurl, function(err, resp, body) {
                storeQuickstats(conf, err, resp, body);
            });

            request(tpurl, function(err, resp, body) {
                storeToppages(conf, err, resp, body);
            });
        }
    };

    var scheduleIntervals = function() {
        hooks.bind('site_initialized', 1000, function(conf) {
            scheduleInterval(conf);
        });

        hooks.bind('settings_saved', 1000, function(conf) {
            scheduleInterval(conf);
        });

        config.eachSync(function(conf) {
            scheduleInterval(conf);
        });
    };

    this.unregister = function(cb) {
        cb();
    }

    this.register = function(_c, info, callback) {
        try {
            initRequires(_c.default().server.base);
            log('Chartbeat', "Initializing Chartbeat plugin", 'info');

            log('Chartbeat', "Adding config to settings page");
            registerSettings();

            log('Chartbeat', 'Creating petal identifiers');
            createPetals();

            log('Chartbeat', 'Hooking on dashboard creation');
            hookOnDashboard();

            log('Chartbeat', 'Register Live Variable');
            registerLiveVar();

            log('Chartbeat', 'Initializing databases');
            initDatabases(function() {
                log('Chartbeat', "Scheduling intervals");
                scheduleIntervals();

                log('Chartbeat', 'All done', 'success');
                callback();
            });
        } catch (e) {
            console.log(e);
        }
    };
};

module.exports = new Chartbeat();
