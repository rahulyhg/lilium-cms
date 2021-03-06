// Libraries inclusion
const db = require('./db.js');
const sharedcache = require('./sharedcache.js');
const hooks = require('../lib/hooks');
const notifications = require('./notifications.js');
const builder = require('../make/build');

// Google API
const {google} = require('googleapis');
const JWT = google.auth.JWT;
const analytics = google.analytics('v3');

// Sites config
const GASites = {};

// Default request metrics and dimensions
const defaultMetrics = ["ga:users", "ga:pageviews", "ga:organicSearches", "ga:sessions"].join(',');
const defaultDimensions = "ga:pagePath";

// Monthly
const monthlyMetrics = ["ga:users", "ga:pageviews", "ga:organicSearches", "ga:sessions"/*, "ga:percentNewSessions", "ga:sessionsPerUser", "ga:avgSessionDuration"*/].join(',');
const monthlyDimensions = "ga:pagePath";

// Cached Analytics Responses
const cachedAnalytics = {};

// Realtime poll
const realtimePollMS = 8000;

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
        const weekBefore = new Date(beforeSun.getFullYear(), beforeSun.getMonth(), beforeSun.getDate() - 7);

        gAnalytics.getData(_c, {
            "start-date" : require('dateformat')(beforeSun, 'yyyy-mm-dd'),
            "end-date" : require('dateformat')(lastSun, 'yyyy-mm-dd'),
            "metrics" : defaultMetrics,
            "dimensions" : "ga:nthDay"
        }, (err, lastweek) => {
            gAnalytics.getData(_c, {
                "start-date" : require('dateformat')(weekBefore, 'yyyy-mm-dd'),
                "end-date" : require('dateformat')(beforeSun, 'yyyy-mm-dd'),
                "metrics" : defaultMetrics,
                "dimensions" : "ga:nthDay"
            }, (err, weekbefore) => {
                send(err, { lastweek, weekbefore })
            });
        });
    }

    static yesterdayAuthor(_c, gAnalytics, send) {
        gAnalytics.getData(_c, {
            "metrics" : "ga:sessions", 
            "start-date" : "7daysAgo", 
            "end-date" : "today", 
            "dimensions" : "ga:dimension" + (_c.analytics && _c.analytics.userDimension ? _c.analytics.userDimension : "2"), 
            "sort" : "-ga:sessions", 
            "max-results" : 10
        }, send);
    }

    static authorDashboard(_c, gAnalytics, userid, send) {
        db.findUnique(require('./config').default(), 'entities', { _id : userid }, (err, user) => {
            const req = {
                "metrics" : defaultMetrics, 
                "start-date" : "30daysAgo", 
                "end-date" : "yesterday", 
                "sort" : "ga:nthDay",
                "dimensions" : "ga:nthDay",
                "filters" : "ga:dimension" + (_c.analytics && _c.analytics.userDimension ? _c.analytics.userDimension : "2") + "==" + user.displayname
            };

            gAnalytics.getData(_c, req, (err, data) => {
                send(err, data);
            });
        });
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

    static fill3Days(_c, gAnalytics, send) {
        gAnalytics.getData(_c, {
            "start-date" : "3daysAgo",
            "end-date" : "today",
            "metrics" : "ga:users",
            "dimensions" : "ga:pagePath",
            "filters" : "ga:pagePath!@?",
            "sort" : "-ga:users",
            "max-results" : 100
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
            "dimensions" : "ga:nthDay"
        }, (err, lastmonthdata) => {
            const monthBefore = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            const monthBeforeEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);

            gAnalytics.getData(_c, {
                "start-date" : require('dateformat')(monthBefore, 'yyyy-mm-dd'),
                "end-date" : require('dateformat')(monthBeforeEnd, 'yyyy-mm-dd'),
                "metrics" : monthlyMetrics,
                "dimensions" : "ga:nthDay"
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
            data = data.data || data;
            base.performance.lastmonth = {
                lastmonth : StatsBeautifier.toPresentableArray(data.lastmonth),
                monthbefore : StatsBeautifier.toPresentableArray(data.monthbefore)
            }; 

            GoogleAnalyticsRequest.last30Days(_c, gAnalytics, (err, data) => {
                base.performance.last30days = StatsBeautifier.toPresentableArray(data.data || data);

                GoogleAnalyticsRequest.lastWeek(_c, gAnalytics, (err, { lastweek, weekbefore }) => {
                    base.performance.lastweek = StatsBeautifier.toPresentableArray(lastweek.data || lastweek);
                    base.performance.weekbefore = StatsBeautifier.toPresentableArray(weekbefore.data || weekbefore);

                    GoogleAnalyticsRequest.sameDay(_c, gAnalytics, (err, data) => {
                        base.performance.sameday = StatsBeautifier.toPresentable(data.data || data);
                        log('Analytics', 'Received extended dashboard data in ' + (Date.now() - datethen) + "ms", 'detail');
                        send(base);
                    });
                });
            });
        });
    }

    static yesterdayAuthor(_c, gAnalytics, send) {
        GoogleAnalyticsRequest.yesterdayAuthor(_c, gAnalytics, (err, arr) => {
            if (err) {
                return send(err);
            }

            const rows = (data.data || data)["rows"].map(x => {
                return {
                    author : x[0],
                    pageviews : x[1]
                };
            });
            
            send(err, rows);
        });
    }

    static dashboard(_c, gAnalytics, send) {
        GoogleAnalyticsRequest.yesterday(_c, gAnalytics, (err, data) => {
            if (err) {
                return send(err);
            }

            data = data.data || data;
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

            db.findUnique(_c, 'content', { name : slug }, (err, article) => {
                db.findUnique(require('./config').default(), 'entities', { _id : article ? article.author : undefined }, (err, author) => {
                    total.toppage = {
                        article : article ? {
                            title : article.title[0],
                            subtitle : article.subtitle[0],
                            date : article.date,
                            author : author ? {
                                displayname : author.displayname,
                                _id : author._id,
                                avatarURL : author.avatarURL
                            } : article.author,
                            facebookmedia : article.facebookmedia
                        } : {title : slug},
                        path : topPagePath,
                        url : _c.server.url + total.ratio.pages[0].page,
                        hits : total.ratio.pages[0].views
                    };
        
                    var today = new Date(); 
                    today.setHours(0,0,0,0);
            
                    var yesterday = new Date(new Date() - 1000 * 60 * 60 * 24);
                    yesterday.setHours(0,0,0,0);
        
                    db.join(_c, 'content', [
                        { 
                            $match : {
                                date : {
                                    $gte : yesterday,
                                    $lt : today
                                }
                            }
                        }, { 
                            $project : { headline : { $arrayElemAt : ["$title", 0] }, name : 1, author : 1, _id : 1 } 
                        }
                    ], arr => {
                        err && log('Analytics', 'Error fetching yesterday pages : ' + err, 'err');
                        total.published = arr;
                        GoogleAnalyticsRequest.extendedDashboard(_c, gAnalytics, total, (extendeddata) => {
                            send(err, extendeddata);
                        });
                    });    
                })
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

    static fill3days(data) {
        return Array.from(
            new Set(
                data.rows.map(x => {
                    const spl = x[0].split('/')
                    return { slug : spl[spl.length - (isNaN(spl[spl.length-1]) ? 1 : 2) ], count : x[1] };
                }
            )
        )).filter(x => x && x.slug);
    }

    static realtime(_c, data) {
        if (!data) { return; }

        const dat = data.data || data;
        let pages = {};

        if (!dat.rows || !dat.rows.forEach) {
            log("Analytics", "Received weird response from Analytics which prevents the realtime data from being stored. Dumping data : ", "warn");
            console.log(data);

            return;
        }

        dat.rows.forEach(x => { 
            let path = x[1];
            let query = "";
            let maybeParam = path.indexOf('?');
            if (maybeParam != -1) {
                const split = path.split('?');
                query = split[1];
                path = split[0];
            }

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

            pages[path].query = query;
        });

        return {
            pages : Object.keys(pages).map(x => pages[x]).sort((a, b) => b.count - a.count),
            at : Date.now(),
            total : dat.totalsForAllResults["rt:activeUsers"]
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
                
        const ArticleLib = require('./content');
        const EntityLib = require('../lib/entities');

        let arti = -1;
        const nextArticle = () => {
            if (++arti == stats.toppages.length) {
                return sendback(stats);
            } 

            ArticleLib.getFull(_c, undefined, (deeparticle) => {
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
            }, { name : stats.toppages[arti].name });
        };

        nextArticle();
    }
}

class GoogleAnalytics {
    get StatsBeautifier() { return StatsBeautifier; }
    get GoogleAnalyticsRequest() { return GoogleAnalyticsRequest; }

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
        if (GASites[_c.id]) {
            cb && cb();
        } else if (_c.analytics) {
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
            if (!this.didWarnNoAuthClient) {
                log("Analytics", "Tried to request Google Analytics data without an authenticated client", 'warn');
                this.didWarnNoAuthClient = true;
            }
            cb & cb(new Error("No auth client defined"));
            return false;
        }

        params = params || {};
        params.ids = "ga:" + _c.analytics.siteviewid;
        params.auth = GASites[_c.id].AUTH_CLIENT;

        analytics.data[realtime ? "realtime" : "ga"].get(params, (err, data) => {
            cb && cb(err, data ? data.data || data : data);
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
        !_c.optoutGA && GoogleAnalyticsRequest.realtime(_c, this, (err, data) => {
            if (data) {
                const beautifulData = StatsBeautifier.realtime(_c, data.data || data);
                beautifulData ? sharedcache.set({
                    ['analytics_realtime_' + _c.id] : beautifulData
                }, done) : done();
            } else {
                done(err);
            }
        });
    }

    get3daysFiller(_c, send) {
        GoogleAnalyticsRequest.fill3Days(_c, this, (err, data) => {
            send(err || StatsBeautifier.fill3days(data.data || data));
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

    getMergedRealtime(sendback) {
        const response = {
            pages : [],
            total : 0,
            sites : [],
            sitetotal : []
        };
        require('./config').each((site, next) => {
            sharedcache.get('analytics_realtime_' + site.id, data => {
                if (!data || !data.pages || !data.pages.map) {
                    return next();
                }

                response.pages = [...response.pages, ...data.pages.map(x => {
                    return { title : x.title, url : site.server.protocol + site.server.url + x.url, count : x.count, site : site.website.sitetitle }
                })];
                response.total += parseInt(data.total);
                response.sites.push(site.website.sitetitle);
                response.sitetotal.push(parseInt(data.total));

                next();
            });
        }, () => {
            response.pages = response.pages.sort((a, b) => b.count - a.count);
            sendback(response)
        });
    }

    generateYesterdayReport(_c, send) {
        if (!GASites[_c.id] || !GASites[_c.id].AUTH_CLIENT) {
            return send(new Error("No GA"));
        }

        this.getData(_c, {
            "start-date" : "yesterday",
            "end-date" : "yesterday",
            "metrics" : defaultMetrics,
            "dimensions" : defaultDimensions,
            "max-results" : 1,
            "sort" : "-ga:pageviews"
        }, (err, traffic) => {
            this.getData(_c, {
                "start-date" : "yesterday",
                "end-date" : "yesterday",
                "metrics" : "ga:users",
                "dimensions" : "ga:operatingSystem",
                "max-results" : 5,
                "sort" : "-ga:users"
            }, (err, os) => {
                send({ traffic, os });                 
            });
        });
    }

    getAllSitesRealtime(send) {
        const sites = require('./config').getAllSites();
        const sitesdata = [];
        let index = -1;
        let nextsite = () => {
            const _c = sites[++index];

            if (_c) {
                sharedcache.get('analytics_realtime_' + _c.id, data => {
                    data && sitesdata.push({
                        data,
                        sitename : _c.website.sitetitle,
                        siteurl : _c.server.url
                    });

                    nextsite();
                });
            } else {
                send(sitesdata);
            }
        };

        nextsite();
    }
}

const that = new GoogleAnalytics();
module.exports = that;
