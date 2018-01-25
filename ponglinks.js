const db = require('./includes/db');
const sharedcache = require('./sharedcache');
const isElder = require('./network/info').isElderChild();
const SHA256 = (str) => require('crypto-js').SHA256(str).toString();
const filelogic = require('./filelogic');

class PongLinks {
    hashDestination(dest) {
        return SHA256(dest);
    }

    adminGET(cli) {
        if (!cli.hasRight('ponglinks')) {
            return cli.refuse();
        }

        filelogic.serveAdminLML3(cli);
    }

    adminPOST(cli) {

    }

    GET(cli) {
        const hash = cli.routeinfo.path[1];
        sharedcache.get("ponglinks_" + hash, domain => domain ? cli.redirect(domain) : cli.throwHTTP(404, undefined, true));
    }

    livevar(cli, levels, params, sendback) {
        sendback({ items : [{
            identifier : "Testin and ballin",
            status : "active",
            outbound : "www.liliumcms.com",
            hash : "a73bd6e7bf737bad837bf82901fba98be78a9c83b7c8ad73",
            uniqueclicks : 13802,
            clicks : 12112
        }]});
    }

    setup() {
        if (isElder) {
            require('./config').each((site, next) => {
                db.createCollection(site, 'ponglinks', () => {
                    db.findToArray(site, 'ponglinks', { active : true }, (err, arr) => {
                        log('Ponglinks', 'Storing ' + arr.length + " links in shared cache");
                        arr.forEach(x => {
                            sharedcache.set({ ["ponglinks_" + x.hash] : x.destination });
                        });

                        next();
                    });
                });
            });
        }
    }
}

module.exports = new PongLinks();
