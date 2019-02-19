const sharedcache = require('./sharedcache');

const CACHE_KEY = "cf_";

class CacheFront {
    setURL(url, data, ctype, expiry, done, extra = {}) {
        sharedcache.set({
            [CACHE_KEY + url] : { data, expiry, ctype, ...extra }
        }, done);
    }

    getURL(url, done) {
        sharedcache.get(CACHE_KEY + url, (payload) => {
            done(payload);
        });
    }
}

module.exports = new CacheFront();
