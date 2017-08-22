const log = require('./log');
const sharedcache = require('./sharedcache');

const CACHE_KEY = "cf_";

class CacheFront {
    setURL(url, data, ctype, expiry, done) {
        sharedcache.set({
            [CACHE_KEY + url] : { data, expiry, ctype }
        }, done);
    }

    getURL(url, done) {
        sharedcache.get(CACHE_KEY + url, (payload) => {
            done(payload);
        });
    }
}

module.exports = new CacheFront();
