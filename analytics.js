// Libraries inclusion
const log = require('./log.js');
const db = require('./includes/db.js');
const livevars = require('./livevars.js');
const sharedcache = require('./sharedcache.js');
const hooks = require('./hooks.js');
const notifications = require('./notifications.js');

// Google API
const googleapis = require('googleapis');
const JWT = googleapis.auth.JWT;
const analytics = googleapis.analytics('v3');

// Sites config
const GASites = {};

// Default request metrics and dimensions
const defaultMetrics = ["ga:users", "ga:pageviews", "ga:organicSearches", "ga:sessions"].join(',');
const defaultDimensions = "ga:pagePath";

// Month days
const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Cached Analytics Responses
const cachedAnalytics = {};

// Realtime poll
const realtimePollMS = 10000;

// Authentication items
class GoogleAnalyticsInfo {
    constructor(email, keyfile) {
        this.SERVICE_ACCOUNT_EMAIL = email;
        this.SERVICE_ACCOUNT_KEY_FILE = keyfile;
        this.AUTH_CLIENT;
    }
}

class GoogleAnalyticsRequest {
    static yesterday(_c, gAnalytics, send) {
        gAnalytics.getData(_c, {
            "start-date" : "yesterday",
            "end-date" : "yesterday",
            "metrics" : defaultMetrics,
            "dimensions" : defaultDimensions,
            "max-results" : 50,
            "sort" : "-ga:pageviews"
        }, send);
    }

    static realtime(_c, gAnalytics, send) {
        gAnalytics.getData(_c, {
            "metrics" : "rt:activeUsers", 
            "dimensions" : "rt:pageTitle,rt:pagePath,rt:source", 
            "sort" : "-rt:activeUsers", 
            "max-results" : 50
        }, send, true);
    }

    static dashboard(_c, gAnalytics, send) {
        GoogleAnalyticsRequest.yesterday(_c, gAnalytics, (err, data) => {
            if (err) {
                return send(err);
            }

            var total = {
                metrics : {
                    unique : data.totalsForAllResults["ga:users"],
                    views : data.totalsForAllResults["ga:pageviews"],
                    searchs : data.totalsForAllResults["ga:organicSearches"],
                    sessions : data.totalsForAllResults["ga:sessions"]
                },
                ratio : {
                    pagepersession : parseFloat(data.totalsForAllResults["ga:pageviews"] / data.totalsForAllResults["ga:sessions"]).toFixed(2),
                    search : Math.round(data.totalsForAllResults["ga:organicSearches"] / data.totalsForAllResults["ga:pageviews"] * 100),
                    devices : {
                        desktop : 0,
                        mobile : 0,
                        tablet : 0
                    },
                    pages : []
                }
            };

            for (var i = 0; i < data.rows.length; i++) {
                total.ratio.pages.push({
                    page : data.rows[i][0],
                    unique : data.rows[i][1],
                    views : data.rows[i][2]
                });
            }

            var topPagePath = total.ratio.pages[0] && total.ratio.pages[0].page.split("/") || [_c.server.url];
            var slug = topPagePath.pop();
            if (!isNaN(slug)) {
                slug = topPagePath.pop();
            }

            require('./article.js').deepFetch(_c, slug, (article) => {
                total.toppage = {
                    article : article || {title : slug},
                    path : topPagePath,
                    url : _c.server.url + total.ratio.pages[0].page,
                    hits : total.ratio.pages[0].views
                };

                var today = new Date(); 
                today.setHours(0,0,0,0);
        
                var yesterday = new Date(new Date() - 1000 * 60 * 60 * 24);
                yesterday.setHours(0,0,0,0);

                db.findToArray(_c, 'content', {
                    date : {
                        $gte : yesterday,
                        $lt : today
                    }
                }, (err, arr) => {
                    total.published = arr;
                    send(undefined, total);
                }, {title : 1, name : 1});
            });
        });
    }

    static lastmonth(_c, gAnalytics, send) {
        var monthNumber = new Date().getMonth();
        var lastDay = monthDays[monthNumber];
        var year = new Date().getFullYear().toString();
        if (year % 4 == 0) {
            lastDay++;
        }

        monthNumber++;
        if (monthNumber < 10) {
            monthNumber = "0" + monthNumber.toString();
        }

        gAnalytics.getData(_c, {
            "start-date" : year + "-" + monthNumber + "-01",
            "end-date" : year + "-" + monthNumber + "-" + lastDay,
            "metrics" : defaultMetrics,
            "dimensions" : defaultDimensions
        }, send);
    }
};

class StatsBeautifier {
    static xToRt(x, path, empty) {
        return {
            title : x[0], 
            url : path, 
            source : x[2].toLowerCase(), 
            count : empty ? 0 : parseInt(x[3]), 
            home : x[1] == "/" 
        };
    }

    static realtime(_c, data) {
        if (!data) { return; }

        let pages = {};
        data.rows.forEach(x => { 
            let path = x[1];
            let lastSlash = path.lastIndexOf('/');
            let maybePage = path.substring(lastSlash + 1);

            if (!isNaN(maybePage)) {
                path = path.substring(0, lastSlash);

                let page = pages[path] || StatsBeautifier.xToRt(x, path, true);
                page.count += parseInt(x[3]);
                page.paginated = true;

                if (!page.retitled) {
                    page.title = page.title.replace(" - Page " + maybePage, '');
                    page.retitled = true;
                }

                pages[path] = page;
            } else {
                let page = StatsBeautifier.xToRt(x, path);
                page.retitled = true;

                if (pages[path]) {
                    pages[path].count += page.count;
                } else {
                    pages[path] = page;
                }
            }
        });

        return {
            pages : Object.keys(pages).map(x => pages[x]).sort((a, b) => b.count - a.count),
            at : Date.now(),
            total : data.totalsForAllResults["rt:activeUsers"]
        }
    }
}

class GoogleAnalytics {
    setAuthInfo(_c, sMail, keyfilePath) {
        log('Analytics', "Setting authentication info");
        GASites[_c.id].SERVICE_ACCOUNT_EMAIL = sMail;
        GASites[_c.id].SERVICE_ACCOUNT_KEY_FILE = keyfilePath;
    }

    loadClient(_c) {
        log('Analytics', 'Loading authentication client');
        if (!GASites[_c.id].SERVICE_ACCOUNT_EMAIL || !GASites[_c.id].SERVICE_ACCOUNT_KEY_FILE) {
            return log('Analytics', 'Missing information to create client', 'warn');
        }

        GASites[_c.id].AUTH_CLIENT = new JWT(
            GASites[_c.id].SERVICE_ACCOUNT_EMAIL,
            GASites[_c.id].SERVICE_ACCOUNT_KEY_FILE,
            null,
            ['https://www.googleapis.com/auth/analytics.readonly']
        );

        return true;
    }

    addSite(_c, cb) {
        if (_c.analytics) {
            GASites[_c.id] = new GoogleAnalyticsInfo(_c.analytics.serviceaccount, _c.analytics.jsonkeypath);
            that.loadClient(_c);
            that.authorize(_c, cb);
        } else {
            GASites[_c.id] = new GoogleAnalyticsInfo();
            cb && cb();
        }
    }

    getData(_c, params, cb, realtime) {
        if (!GASites[_c.id].AUTH_CLIENT) {
            log("Analytics", "Tried to request Google Analytics data without an authenticated client", 'warn');
            cb & cb(new Error("No auth client defined"));
            return false;
        }

        params = params || {};
        params.ids = "ga:" + _c.analytics.siteviewid;
        params.auth = GASites[_c.id].AUTH_CLIENT;

        analytics.data[realtime ? "realtime" : "ga"].get(params, (err, data) => {
            cb && cb(err, data);
        });
    }

    authorize(_c, cb) {
        log('Analytics', 'Authorizing and requesting token');
        if (!GASites[_c.id].AUTH_CLIENT) {
            log("Analytics", 'No authentication client object defined', 'warn');
            cb && cb(new Error("Missing authentication client object"));
            return false;
        }

        GASites[_c.id].AUTH_CLIENT.authorize((err, tokens) => {
            if (err) {
                log('Analytics', 'Could not authenticate with Google Analytics API. Got error : ' + err, 'warn');
            } else {
                log('Analytics', 'Successfully authenticated with Google Analytics API.', 'success');
            }

            cb && cb(err, tokens);
        });
    }

    storeRealtime(_c, done) {
        GoogleAnalyticsRequest.realtime(_c, this, (err, data) => {
            if (data) {
                sharedcache.set({
                    ['analytics_realtime_' + _c.id] : StatsBeautifier.realtime(_c, data)
                }, done);
            } else {
                log('Analytics', 'Error while fetching realtime data : ' + err, 'warn');
                done(err);
            }
        });
    }

    pollRealtime(_c) {
        setInterval(() => {
            this.sockSendRealtime(_c);
        }, realtimePollMS);
    }

    sockSendRealtime(_c) {
        sharedcache.get('analytics_realtime_' + _c.id, (data) => {
            data && notifications.emitToWebsite(_c.id, data, 'analytics_realtime');
        });
    }

    livevar(cli, levels, params, send) {
        var topLevel = levels[0] || "lastmonth";

        if (topLevel == "realtime") {
            sharedcache.get('analytics_realtime_' + cli._c.id, (data) => {
                if (data) {
                    send(data);
                } else {
                    GoogleAnalyticsRequest.realtime(cli._c, that, (err, data) => {
                        if (data) {
                            data = StatsBeautifier.realtime(data);
                            send(data);

                            sharedcache.set({ ["analytics_realtime_" + cli._c.id] : data });
                        } else {
                            send([]);
                        }
                    });
                }
            });
        } else {
            sharedcache.get('analytics_cache_' + topLevel + "_" + cli._c.uid, (cachedAnalytics) => {
                if (cachedAnalytics && new Date().getTime() - cachedAnalytics.cachedAt < (1000 * 60 * 60)) {
                    send(cachedAnalytics.data);
                } else if (typeof GoogleAnalyticsRequest[topLevel] == "function") {
                    GoogleAnalyticsRequest[topLevel](cli._c, that, (err, data) => {
                        if (data) {
                            if (StatsBeautifier[topLevel]) {
                                data = StatsBeautifier[topLevel](cli._c, data);
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

    settingsSaved(cli) {
        that.addSite(cli._c);
    }

    prepareDashboard() {
        require('./petal.js').register(
            'dashboardAnalytics', 
            require('./config.js').default().server.base + "backend/dynamic/dashanalytics.petal"
        );

        require('./dashboard.js').registerDashPetal("dashboardAnalytics", 200);
    }

    setup() {
        log('Analytics', "Analytics controller setup");
        that.prepareDashboard();
    }
}

const that = new GoogleAnalytics();
module.exports = that;
