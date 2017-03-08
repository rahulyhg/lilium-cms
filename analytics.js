// Libraries inclusion
const log = require('./log.js');
const db = require('./includes/db.js');
const livevars = require('./livevars.js');

// Google API
const googleapis = require('googleapis');
const JWT = googleapis.auth.JWT;
const analytics = googleapis.analytics('v3');

// Authentication items
class GoogleAnalyticsInfo {
    constructor(email, keyfile) {
        this.SERVICE_ACCOUNT_EMAIL = email;
        this.SERVICE_ACCOUNT_KEY_FILE = keyfile;
        this.AUTH_CLIENT;
    }
}

// Sites config
let GASites = {};

// Default request metrics and dimensions
const defaultMetrics = ["ga:users", "ga:pageviews", "ga:organicSearches"].join(',');
const defaultDimensions = "ga:deviceCategory";

// Month days
const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

class GoogleAnalyticsRequest {
    static yesterday(_c, gAnalytics, send) {
        gAnalytics.getData(_c, {
            "start-date" : "yesterday",
            "end-date" : "yesterday",
            "metrics" : defaultMetrics,
            "dimensions" : defaultDimensions
        }, send);
    }

    static lastmonth(_c, gAnalytics, send) {
        var monthNumber = new Date().getMonth();
        var lastDay = monthDays[monthNumber];
        var year = new Date().getYear();
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
        if (typeof GoogleAnalyticsRequest[topLevel] == "function") {
            GoogleAnalyticsRequest[topLevel](cli._c, that, (err, data) => {
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

    setupController() {
        log('Analytics', "Analytics controller setup");
        livevars.registerLiveVariable('googleanalytics', that.handleLiveVar);
        that.bindHooks();
    }
}

const that = new GoogleAnalytics();
module.exports = that;
