// Libraries
const sharedcache = require('./sharedcache');
const db = require('./includes/db');

// Constants
const CACHE_PREFIX = "padlock_";
const BLOCK_THRESHOLD = 5;

class Padlock {
    loginFailed(userid, sendback) {
        sharedcache.get(CACHE_PREFIX + "failed_" + userid, num => {
            const newnum = num ? ++num : 1;
            sharedcache.set({ [CACHE_PREFIX + "failed_" + userid] : newnum }, () => {
                if (BLOCK_THRESHOLD - newnum <= 0) {
                    // React accordingly
                }

                sendback && sendback(BLOCK_THRESHOLD - newnum);
            });
        });
    }

    userCanLogin(userid, sendback) {
        sharedcache.get(CACHE_PREFIX + "failed_" + userid, num => {
            sendback(!num || num < BLOCK_THRESHOLD);
        })
    }

    refreshFailedLoginCount(userid, done) {
        sharedcache.get(CACHE_PREFIX + "failed_" + userid, 0);
    }
}

module.exports = new Padlock();