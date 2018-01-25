const db = require('./includes/db');
const sharedcache = require('./sharedcache');
const isElder = require('./network/info').isElderChild();

class PongLinks {
    adminGET(cli) {

    }

    adminPOST(cli) {

    }

    GET(cli) {
        
    }

    livevar(cli, levels, params, sendback) {

    }

    setup() {
        if (isElder) {
            require('./config').each((site, next) => {
                db.createCollection(site, 'ponglinks', () => {
                    db.findToArray(site, 'ponglinks', { active : true }, (err, arr) => {
                        log('Ponglink', 'Storing ' + arr.length + " links in shared cache");
                        arr.forEach(x => {
                            sharedcache.set({ ["ponglink_" + x.hash] : x.destination });
                        });

                        next();
                    });
                });
            });
        }
    }
}

module.exports = new PongLinks();
