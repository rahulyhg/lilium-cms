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

// Monthly
const monthlyMetrics = ["ga:sessions", "ga:users", "ga:pageviews", "ga:percentNewSessions", "ga:sessionsPerUser", "ga:avgSessionDuration"].join(',');
const monthlyDimensions = "ga:pagePath";

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

    static sameDay(_c, gAnalytics, send) {
        const now = new Date();
        const sameday = require('dateformat')(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8), 'yyyy-mm-dd');

        gAnalytics.getData(_c, {
            "start-date" : sameday,
            "end-date" : sameday,
            "metrics" : defaultMetrics,
            "dimensions" : defaultDimensions
        }, send);
    }

    static lastWeek(_c, gAnalytics, send) {
        const lastSun = new Date();
        lastSun.setDate(lastSun.getDate() - lastSun.getDay());

        const beforeSun = new Date(lastSun.getFullYear(), lastSun.getMonth(), lastSun.getDate() - 7);

        gAnalytics.getData(_c, {
            "start-date" : require('dateformat')(beforeSun, 'yyyy-mm-dd'),
            "end-date" : require('dateformat')(lastSun, 'yyyy-mm-dd'),
            "metrics" : defaultMetrics,
            "dimensions" : defaultDimensions
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

    static last30Days(_c, gAnalytics, send) {
        gAnalytics.getData(_c, {
            "start-date" : "30daysAgo",
            "end-date" : "yesterday",
            "metrics" : defaultMetrics,
            "dimensions" : "ga:nthDay"
        }, send);
    }

    static lastMonth(_c, gAnalytics, send) {
        const now = new Date();
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); 
        const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);

        gAnalytics.getData(_c, {
            "start-date" : require('dateformat')(lastMonthStart, 'yyyy-mm-dd'),
            "end-date" : require('dateformat')(lastMonthEnd, 'yyyy-mm-dd'),
            "metrics" : monthlyMetrics,
            "dimensions" : monthlyDimensions
        }, (err, lastmonthdata) => {
            const monthBefore = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            const monthBeforeEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);

            gAnalytics.getData(_c, {
                "start-date" : require('dateformat')(monthBefore, 'yyyy-mm-dd'),
                "end-date" : require('dateformat')(monthBeforeEnd, 'yyyy-mm-dd'),
                "metrics" : monthlyMetrics,
                "dimensions" : monthlyDimensions
            }, (err, monthbeforedata) => {
                send({ lastmonth : lastmonthdata, monthbefore : monthbeforedata });
            });
        });
    }
    
    static extendedDashboard(_c, gAnalytics, original, send) {
        log('Analytics', 'Requesting extended dashboard', 'detail');
        const base = {
            performance : {
                yesterday : {
                    metrics : original.metrics,
                    toppage : original.toppage,
                    published : original.published,
                    ratio : original.ratio
                }
            }
        };

        const datethen = Date.now();
        GoogleAnalyticsRequest.lastMonth(_c, gAnalytics, (data) => {
            base.performance.lastmonth = {
                lastmonth : StatsBeautifier.toPresentable(data.lastmonth),
                monthbefore : StatsBeautifier.toPresentable(data.monthbefore)
            }; 

            GoogleAnalyticsRequest.last30Days(_c, gAnalytics, (err, data) => {
                base.performance.last30days = StatsBeautifier.toPresentableArray(data);

                GoogleAnalyticsRequest.lastWeek(_c, gAnalytics, (err, data) => {
                    base.performance.lastweek = StatsBeautifier.toPresentable(data);

                    GoogleAnalyticsRequest.sameDay(_c, gAnalytics, (err, data) => {
                        base.performance.sameday = StatsBeautifier.toPresentable(data);
                        log('Analytics', 'Received extended dashboard data in ' + (Date.now() - datethen) + "ms", 'detail');
                        send(base);
                    });
                });
            });
        });
    }

    static dashboard(_c, gAnalytics, send) {
        GoogleAnalyticsRequest.yesterday(_c, gAnalytics, (err, data) => {
            if (err) {
                return send(err);
            }

            const metrics = {
                unique : data.totalsForAllResults["ga:users"],
                views : data.totalsForAllResults["ga:pageviews"],
                searchs : data.totalsForAllResults["ga:organicSearches"],
                sessions : data.totalsForAllResults["ga:sessions"]
            };

            var total = {
                metrics,
                ratio : {
                    pagepersession : parseFloat(metrics.views / metrics.sessions).toFixed(2),
                    search : Math.round(metrics.searchs / metrics.views * 100),
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

            var maybeParam = slug.indexOf('?');
            if (maybeParam != -1) {
                slug = slug.substring(0, maybeParam);
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
                    GoogleAnalyticsRequest.extendedDashboard(_c, gAnalytics, total, (extendeddata) => {
                        send(err, extendeddata);
                    });
                }, {title : 1, name : 1});
            });
        });
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

    static toPresentableArray(data) {
        return {
            unique : data.totalsForAllResults["ga:users"],
            views : data.totalsForAllResults["ga:pageviews"],
            sessions : data.totalsForAllResults["ga:sessions"],
            daily : data.rows.map(x => {
                return {
                    unique : x[1],
                    views : x[2],
                    organicsearch : x[3],
                    sessions : x[4]
                }
            })
        };
    }

    static toPresentable(data) {
        return {
            unique : data.totalsForAllResults["ga:users"],
            views : data.totalsForAllResults["ga:pageviews"],
            sessions : data.totalsForAllResults["ga:sessions"]
        };
    }

    static realtime(_c, data) {
        if (!data) { return; }

        let pages = {};
        data.rows.forEach(x => { 
            // rt:pageTitle ,rt:pagePath, rt:source
            let path = x[1];
            let lastSlash = path.lastIndexOf('/');
            let maybePage = path.substring(lastSlash + 1);

            let maybeParam = path.indexOf('?');
            if (maybeParam != -1) {
                path = path.substring(0, maybeParam);
            }

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

    static lastMonth(_c, data, sendback) {
        const lastmonth = data.lastmonth;
        const monthbefore = data.monthbefore;

        const stats = {
            month : new Date().getMonth() - 1,

            lastmonth : {
                session :            lastmonth.totalsForAllResults["ga:sessions"],
                users :              lastmonth.totalsForAllResults["ga:users"],
                pageviews :          lastmonth.totalsForAllResults["ga:pageviews"],
                newsessions :        lastmonth.totalsForAllResults["ga:percentNewSessions"],
                sessionsperuser :    lastmonth.totalsForAllResults["ga:sessionsPerUser"],
                avgsessionduration : lastmonth.totalsForAllResults["ga:avgSessionDuration"]
            },
            monthbefore : {
                session :            monthbefore.totalsForAllResults["ga:sessions"],
                users :              monthbefore.totalsForAllResults["ga:users"],
                pageviews :          monthbefore.totalsForAllResults["ga:pageviews"],
                newsessions :        monthbefore.totalsForAllResults["ga:percentNewSessions"],
                sessionsperuser :    monthbefore.totalsForAllResults["ga:sessionsPerUser"],
                avgsessionduration : monthbefore.totalsForAllResults["ga:avgSessionDuration"]
            },

            toppages : []
        };

        // Get 3 top pages
        const slugs = [];
        for (let i = 0; i < lastmonth.rows.length && stats.toppages.length < 3; i++) {
            let row = lastmonth.rows[i];
            let slug = row[0];
            let maybeParam = slug.indexOf('?');
            if (maybeParam != -1) {
                slug = slug.substring(0, maybeParam);
            }
            let split = slug.split('/');

            slug = split[split.length - (!isNaN(split[split.length-1]) ? 2 : 1)];
            if (!slugs.includes(slug)) {
                stats.toppages.push({ 
                    index : i, 
                    name : slug, 
                    sessions : row[1],
                    users : row[2],
                    pageviews : row[3],
                    newsessions : row[4],
                    sessionsperuser : row[5],
                    avgsessionduration : row[6]
                });

                slugs.push(slug);
            }
        }
                
        const ArticleLib = require('./article');
        const EntityLib = require('./entities');

        let arti = -1;
        const nextArticle = () => {
            if (++arti == stats.toppages.length) {
                return sendback(stats);
            } 

            ArticleLib.deepFetch(_c, stats.toppages[arti].name, (deeparticle) => {
                if (deeparticle) {
                    deeparticle.content = undefined;
                    deeparticle.images = undefined;
                    deeparticle.featuredimage = undefined;
                    deeparticle.related = undefined;
                    deeparticle.author = deeparticle.authors && EntityLib.toPresentable(deeparticle.authors[0]);
                    deeparticle.authors = undefined;
                }

                stats.toppages[arti].article = deeparticle;
                nextArticle();
            });
        };

        nextArticle();
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
        } else if (topLevel == "dashboard") {
            const cachekey = 'analytics_dashboard_' + cli._c.id;
            sharedcache.get(cachekey, (data) => {
                if (data && new Date().getTime() - data.cachedAt < (1000 * 60 * 60 * 6)) {
                    send(data);
                } else {
                    GoogleAnalyticsRequest.dashboard(cli._c, this, (err, data) => {
                        if (data) {
                            send(data);

                            data.cachedAt = Date.now();
                            sharedcache.set({[cachekey] : data});
                        } else {
                            send({ error : err, valid : false});
                        }
                    });
                }
            });
        } else if (topLevel == "lastMonth") {
            const cachekey = 'analytics_lastmonth_' + cli._c.id;
            sharedcache.get(cachekey, (data) => {
                if (data && data.month == new Date().getMonth() - 1) {
                    send(data);
                } else {
                    GoogleAnalyticsRequest.lastMonth(cli._c, that, data => {
                        if (data) {
                            StatsBeautifier.lastMonth(cli._c, data, finaldata => {
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
