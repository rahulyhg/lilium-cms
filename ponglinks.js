const db = require('./includes/db');
const sharedcache = require('./sharedcache');
const isElder = require('./network/info').isElderChild();
const SHA256 = (str) => require('crypto-js').SHA256(str).toString();
const filelogic = require('./filelogic');

const ALLOWED_EDIT_FIELDS = [
    "destination", "identifier", "status"
];

class PongLinks {
    hashDestination(dest) {
        return SHA256(dest);
    }

    parseEditFields(keyval) {
        const edit = {};
        ALLOWED_EDIT_FIELDS.forEach(x => {
            if (keyval[x]) {
                edit[x] = keyval[x];
            }
        });

        return edit;
    }

    adminGET(cli) {
        if (!cli.hasRight('ponglinks')) {
            return cli.refuse();
        }

        if (cli.routeinfo.path[3]) {
            filelogic.serveAdminLML3(cli, true);
        } else {
            filelogic.serveAdminLML3(cli);
        }
    }

    editLink(_c, _id, keyval, done) {
        db.update(_c, 'ponglinks', { _id }, this.parseEditFields(keyval), (err, r) => done(err, !!r.modifiedCount));
    }   

    createLink(_c, creatorid, link, done) {
        const hash = this.hashDestination(link.identifier + link.destination);
        db.insert(_c, 'ponglinks', {
            creatorid, hash,
            createdOn : new Date(),
            createdAt : Date.now(),

            status : "active", 
            identifier : link.identifier,
            destination : link.destination,
            uniqueclicks : 0,
            clicks : 0
        }, (err, r) => {
            done(err, r.insertedId);
            sharedcache.set({ ["ponglinks_" + hash] : link.destination });
        });
    }

    adminPOST(cli) {
        if (!cli.hasRight('ponglinks')) {
            return cli.refuse();
        }

        const action = cli.routeinfo.path[2];
        if (action == "create") {
            this.createLink(cli._c, db.mongoID(cli.userinfo.userid), cli.postdata.data, (err, id)  => cli.sendJSON(err ? { error : err.toString() } : { id }) );
        } else if (action == "edit") {
            this.editLink(cli._c, db.mongoID(cli.routeinfo.path[3]), cli.postdata.data, (err, mod) => cli.sendJSON(err ? { error : err.toString() } : { mod }));
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    GET(cli) {
        const hash = cli.routeinfo.path[1];
        sharedcache.get("ponglinks_" + hash, domain => domain ? cli.redirect(domain) : cli.throwHTTP(404, undefined, true));

        db.increment(cli._c, 'ponglinks', { hash, status : "active" }, { clicks : 1 });
        db.insert(cli._c, 'pongclicks', { at : Date.now(), ip : cli.ip }, () => {});
    }

    livevar(cli, levels, params, sendback) {
        const $match = { };

        if (levels[0] == "insights") {
            db.findUnique(cli._c, 'ponglinks', { _id : db.mongoID(levels[1]) }, (err, link) => {
                sendback(link);
            });
        } else {
            if (params.filters.search) {
                $match.identifier = new RegExp(params.filters.search, 'i');
            }

            if (params.filters.status) {
                $match.status = params.filters.status;
            }

            db.join(cli._c, 'ponglinks', [ {$match}, {$sort : {_id : -1}} ], (items) => {
                sendback({ items });
            });
        }
    }

    setup() {
        if (isElder) {
            log('Ponglinks', 'Elder process is storing links', 'info');
            const sites = require('./config').getAllSites();
            sites.forEach(site => {
                db.createCollections(site, ['ponglinks', 'pongclicks'], () => {
                    db.findToArray(site, 'ponglinks', {}, (err, arr) => {
                        log('Ponglinks', 'Storing ' + arr.length + " links in shared cache", 'success');
                        arr.forEach(x => {
                            sharedcache.set({ ["ponglinks_" + x.hash] : x.destination });
                        });
                    });
                });
            });
        }
    }
}

module.exports = new PongLinks();
