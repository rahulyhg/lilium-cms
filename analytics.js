// Libraries inclusion
const log = require('./log.js');
const db = require('./includes/db.js');
const livevars = require('./livevars.js');

// Google API
const googleapis = require('googleapis');
const JWT = googleapis.auth.JWT;
const analytics = googleapis.analytics('v3');

// Sites config
let GASites = {};

// Default request metrics and dimensions
const defaultMetrics = ["ga:users", "ga:pageviews", "ga:organicSearches", "ga:sessions"].join(',');
const defaultDimensions = "ga:pagePath";

// Month days
const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Cached Analytics Responses
const cachedAnalytics = {};

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
            "max-results" : 10,
            "sort" : "-ga:pageviews"
        }, send);
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

            var topPagePath = total.ratio.pages[0] && total.ratio.pages[0].page.substring(1);

            require('./article.js').deepFetch(_c, topPagePath, (article) => {
                total.toppage = {
                    article : article || {title : topPagePath},
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

    getData(_c, params, cb) {
        if (!GASites[_c.id].AUTH_CLIENT) {
            log("Analytics", "Tried to request Google Analytics data without an authenticated client", 'warn');
            cb & cb(new Error("No auth client defined"));
            return false;
        }

        params = params || {};
        params.ids = "ga:" + _c.analytics.siteviewid;
        params.auth = GASites[_c.id].AUTH_CLIENT;

        analytics.data.ga.get(params, (err, data) => {
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

    handleLiveVar(cli, levels, params, send) {
        var topLevel = levels[0] || "lastmonth";

        if (cachedAnalytics[topLevel] && new Date() - cachedAnalytics[topLevel].cachedAt < (1000 * 60 * 60)) {
            send(cachedAnalytics[topLevel].data);
        } else if (typeof GoogleAnalyticsRequest[topLevel] == "function") {
            GoogleAnalyticsRequest[topLevel](cli._c, that, (err, data) => {
                if (data) {
                    data.cachehit = true;
                    cachedAnalytics[topLevel] = {
                        cachedAt : new Date(),
                        data : data
                    };
                }

                send(err ? {error : err.toString()} : data);
            });
        } else {
            send({error : "Undefined level : " + topLevel});
        }
    }

    bindHooks() {
        require('./hooks.js').register('settings_saved', 1000, (cli) => {
            that.addSite(cli._c);
        });
    }

    prepareDashboard() {
        require('./petal.js').register(
            'dashboardAnalytics', 
            require('./config.js').default().server.base + "backend/dynamic/dashanalytics.petal"
        );

        require('./dashboard.js').registerDashPetal("dashboardAnalytics", 200);
    }

    setupController() {
        log('Analytics', "Analytics controller setup");
        livevars.registerLiveVariable('googleanalytics', that.handleLiveVar);
        that.bindHooks();
        that.prepareDashboard();
    }
}

const that = new GoogleAnalytics();
module.exports = that;
