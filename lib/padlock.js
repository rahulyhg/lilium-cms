// Libraries
const sharedcache = require('../lib/sharedcache');
const db = require('../lib/db');
const configLib = require('../lib/config');

// Constants
const CACHE_PREFIX = "padlock_";

class Padlock {
    get blockThreshold() {
        return configLib.default().allowedLoginAttempts || 5;
    }

    loginFailed(username, sendback) {
        sharedcache.get(CACHE_PREFIX + "failed_" + username, num => {
            const newnum = num ? ++num : 1;
            if (this.blockThreshold - newnum <= 0) {
                this.blockUser(username, () => {
                    this.refreshFailedLoginCount(username, () => {
                        sendback && sendback(true);
                    });
                });
            } else {
                sharedcache.set({ [CACHE_PREFIX + "failed_" + username] : newnum }, () => {
                    sendback && sendback(false);
                });
            }
        });
    }

    isUserLocked(username, done) {
        sharedcache.get(CACHE_PREFIX + "locked_" + username, lock => {
            if (lock && lock.until > Date.now()) {
                done(lock.until);
            } else {
                done(false);
            }
        });
    }   

    blockUser(username, done) {
        sharedcache.set({
            [ CACHE_PREFIX + "locked_" + username ] : {
                until : Date.now() + (1000 * 60 * 5)
            }
        }, () => {
            done();
        });
    }

    refreshFailedLoginCount(username, done) {
        sharedcache.set({[CACHE_PREFIX + "failed_" + username] : 0}, () => done());
    }
}

module.exports = new Padlock();
