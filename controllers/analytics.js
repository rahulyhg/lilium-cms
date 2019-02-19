const galib = require('../lib/analytics');
const sharedcache = require('../lib/sharedcache.js');
const builder = require('../make/build');
const db = require('../lib/db');

const GoogleAnalyticsRequest = galib.GoogleAnalyticsRequest;
const StatsBeautifier = galib.StatsBeautifier;

class GoogleAnalyticsController {
    setup() {
        log('Analytics', "Analytics controller setup");

        require('../lib/config').eachSync(_c => {
            builder.pushToBuildTree(_c, "networkboard", 'networkboard', {
                babel : {
                    "plugins": [
                        ["transform-react-jsx", { "pragma":"h" }]
                    ],
                    "presets" : ["es2015"]
                }
            });
        });
    }

    settingsSaved(cli) {
        galib.addSite(cli._c);
    }

    livevar(cli, levels, params, send) {
        var topLevel = levels[0] || "lastmonth";

        if (topLevel == "realtime") {
            sharedcache.get('analytics_realtime_' + cli._c.id, (data) => {
                if (data) {
                    send(data);
                } else {
                    GoogleAnalyticsRequest.realtime(cli._c, galib, (err, data) => {
                        if (data) {
                            data = StatsBeautifier.realtime(data.data || data);
                            send(data);

                            sharedcache.set({ ["analytics_realtime_" + cli._c.id] : data });
                        } else {
                            send([]);
                        }
                    });
                }
            });
        } else if (topLevel == "author") {
            const cachekey = 'analytics_dashboard_author_' + cli.userinfo.userid;

            sharedcache.get(cachekey, (data) => {
                if (data && new Date().getTime() - data.cachedAt < (1000 * 60 * 60 * 6)) {
                    send(data);
                } else {
                    GoogleAnalyticsRequest.authorDashboard(cli._c, galib, db.mongoID(cli.userinfo.userid), (err, data) => {
                        if (data) {
                            data = StatsBeautifier.toPresentableArray(data.data || data)
                            send(data);

                            data.cachedAt = Date.now();
                            sharedcache.set({[cachekey] : data});
                        } else {
                            console.log(err.toString());
                            send({ error : err && err.toString(), valid : false});
                        }
                    });
                }
            });
            
        } else if (topLevel == "dashboard") {
            const cachekey = 'analytics_dashboard_' + cli._c.id;
            sharedcache.get(cachekey, (data) => {
                if (data && new Date().getTime() - data.cachedAt < (1000 * 60 * 60 * 6)) {
                    send(data);
                } else {
                    GoogleAnalyticsRequest.dashboard(cli._c, galib, (err, data) => {
                        if (data) {
                            send(data);

                            data.cachedAt = Date.now();
                            sharedcache.set({[cachekey] : data});
                        } else {
                            send({ error : err && err.toString(), valid : false, err_json : JSON.stringify(err || {})});
                        }
                    });
                }
            });
        } else if (topLevel == "merged") {
            galib.getMergedRealtime(resp => send(resp));
        } else if (topLevel == "lastMonth") {
            const cachekey = 'analytics_lastmonth_' + cli._c.id;
            sharedcache.get(cachekey, (data) => {
                if (data && data.month == new Date().getMonth() - 1) {
                    send(data);
                } else {
                    GoogleAnalyticsRequest.lastMonth(cli._c, galib, data => {
                        if (data) {
                            StatsBeautifier.lastMonth(cli._c, data.data || data, finaldata => {
                               send(finaldata);
                               sharedcache.set({[cachekey] : finaldata});
                            });
                        } else {
                            send({error : err, valid : false});
                        }
                    });
                }
            });
        } else {
            sharedcache.get('analytics_cache_' + topLevel + "_" + cli._c.uid, (cachedAnalytics) => {
                if (cachedAnalytics && new Date().getTime() - cachedAnalytics.cachedAt < (1000 * 60 * 60 * 6)) {
                    send(cachedAnalytics.data);
                } else if (typeof GoogleAnalyticsRequest[topLevel] == "function") {
                    GoogleAnalyticsRequest[topLevel](cli._c, galib, (err, data) => {
                        if (data) {
                            if (StatsBeautifier[topLevel]) {
                                data = StatsBeautifier[topLevel](cli._c, data.data || data);
                            }

                            let cached = {}
                            cached['analytics_cache_' + topLevel + "_" + cli._c.uid] = {
                                cachedAt : new Date().getTime(),
                                data : data
                            };

                            log('Analytics', "Caching values for top level " + topLevel);
                            hooks.fire("analytics_refresh_" + topLevel, {data, _c : cli._c});

                            data.cachehit = true;
                            sharedcache.set(cached); 
                        }

                        send(err ? {error : err.toString()} : data);
                    });
                } else {
                    send({error : "Undefined level : " + topLevel});
                }
            });
        }
    }

    GET(cli) {
        if (cli.userinfo.loggedin) {
            const action = cli.routeinfo.path[1];
            switch (action) {
                case undefined:
                case "":
                    require('../lml3/compiler').compile(cli._c, liliumroot + '/backend/dynamic/analytics.lml3', {}, markup => {
                        cli.sendHTML(markup);
                    });
                    break;

                case "network": 
                    galib.getAllSitesRealtime(data => cli.sendJSON({data}));
                    break;

                default:
                    cli.throwHTTP(404, undefined, true);
            }
        } else {
            cli.redirect("/login?to=" + cli._c.server.protocol + cli._c.server.url + "/googleanalytics");
        }
    }
}

module.exports = new GoogleAnalyticsController();
