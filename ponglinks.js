const db = require('./includes/db');
const sharedcache = require('./sharedcache');
const isElder = require('./network/info').isElderChild();
const SHA1 = (str) => require('crypto-js').SHA1(str).toString();
const filelogic = require('./filelogic');

const ALLOWED_EDIT_FIELDS = [
    "destination", "identifier", "status"
];

class PongLinks {
    hashDestination(dest) {
        return new Buffer(Date.now().toString()).toString('base64').slice(0, -2);

        // Old logic
        return new Buffer(SHA1(dest)).toString('base64').substring(10);
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
        const hash = this.hashDestination(JSON.stringify(link));
        const versions = link.versions.map((v, i) => {
            v.identifier = v.identifier.trim().replace(/[\s\&]/g, '_');

            return {
                destination : v.destination.trim() + (v.destination.includes("?") ? "&" : "?") +
                    "utm_campaign=" + link.defaults.campaign +
                    "&utm_source=" + link.defaults.source +
                    "&utm_medium=" + v.identifier,
                hash : i + 1000,
                medium : v.identifier
            };
        });

        db.insert(_c, 'ponglinks', {
            creatorid, hash, versions,

            createdOn : new Date(),
            createdAt : Date.now(),

            status : "active", 
            identifier : link.identifier,
            defaults : link.defaults,
            clicks : 0
        }, (err, r) => {
            done(err, r.insertedId);

            const set = {};
            versions.forEach(x => {
                set["ponglinks_" + hash + x.hash] = x.destination;
            });

            sharedcache.set(set);
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
            cli.throwHTTP(404, undcefined, true);
        }
    }

    GET(cli) {
        const hash = cli.routeinfo.path[1];
        const version = cli.routeinfo.params.version || cli.routeinfo.path[2];
        sharedcache.get("ponglinks_" + hash + version, domain => domain ? cli.redirect(domain) : cli.throwHTTP(404, undefined, true));

        db.increment(cli._c, 'ponglinks', { hash, status : "active" }, { clicks : 1 }, (r) => {
            r.modifiedCount && db.insert(cli._c, 'pongclicks', { at : new Date(), ip : cli.ip, hash, version }, () => {});
        });
    }

    livevar(cli, levels, params, sendback) {
        const $match = { };

        if (levels[0] == "insights") {
            db.findUnique(cli._c, 'ponglinks', { _id : db.mongoID(levels[1]) }, (err, link) => {
                db.join(cli._c, 'pongclicks', [
                    { $match : { hash : link.hash } },
                    { $group: { 
                        _id: { $dayOfYear: "$at" },
                        clicks: { $sum: 1 }
                    } },
                    { $project : {
                        day : "$_id", clicks : 1, _id : 0 
                    } },
                    { $sort : {
                        day : -1
                    } }
                ], (daily) => {
                    db.join(cli._c, 'pongclicks', [
                        { $match : { hash : link.hash } },
                        { $group: { 
                            _id: "$version",
                            clicks: { $sum: 1 }
                        } },
                        { $project : {
                            version : "$_id", clicks : 1, _id : 0
                        } }
                    ], (versions) => {
                        sendback({ link, daily, versions });
                    });
                });
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
                        const set = {};
                        log('Ponglinks', 'Storing ' + arr.length + " links in shared cache", 'success');
                        arr.forEach(x => {
                            x.versions.forEach(v => {
                                set["ponglinks_" + x.hash + (v.name || v.hash)] = v.destination;
                            });
                        });

                        sharedcache.set(set);
                    });
                });
            });
        }
    }
}

module.exports = new PongLinks();
