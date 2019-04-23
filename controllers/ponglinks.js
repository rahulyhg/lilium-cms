const db = require('../lib/db');
const sharedcache = require('../lib/sharedcache');
const isElder = require('../network/info').isElderChild();
const filelogic = require('../pipeline/filelogic');

const ALLOWED_EDIT_FIELDS = [
    "destination", "identifier", "status"
];

const plib = require('../lib/ponglinks');

class PongLinks {
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

    adminPOST(cli) {
        if (cli.hasRightOrRefuse('ponglinks')) {            
            const action = cli.routeinfo.path[2];
            if (action == "create") {
                plib.createLink(cli._c, db.mongoID(cli.userinfo.userid), cli.postdata.data, (err, id)  => cli.sendJSON(err ? { error : err.toString() } : { id }) );
            } else if (action == "edit") {
                plib.editLink(cli._c, db.mongoID(cli.routeinfo.path[3]), cli.postdata.data, (err, mod) => cli.sendJSON(err ? { error : err.toString() } : { mod }));
            } else {
                cli.throwHTTP(404, undcefined, true);
            }
        }
    }

    adminPUT(cli) {
        if (cli.hasRightOrRefuse('ponglinks')) {
            if (cli.routeinfo.path[2] && db.isValidMongoID(cli.routeinfo.path[2])) {
                cli.readPostData(json => {
                    const newValues = {};
                    if (json.versions) {
                        newValues.versions = json.versions || [];
                        plib.maybeCreateHash(json.versions);
                        
                    }
                    if (json.defaults) newValues.defaults = json.defaults;
                    if (json.identifier) newValues.identifier = json.identifier;

                    db.update(cli._c, 'ponglinks', { _id: db.mongoID(cli.routeinfo.path[2]) }, {...json}, (err, r) => {
                        if (!err) {
                            db.findUnique(cli._c, 'ponglinks', { _id: db.mongoID(cli.routeinfo.path[2]) }, (err, updated) => {
                                if (!err) {
                                    cli.sendJSON({ ok: true, updated });

                                    if (updated.versions && updated.versions.length) {
                                        const set = {};
                                        updated.versions.forEach(v => {
                                            set["ponglinks_" + updated.hash + (v.name || v.hash)] = v.destination;
                                        });
                                        sharedcache.set(set);
                                    }
                                } else {
                                    cli.throwHTTP(500, 'Error while updating ponglink', true);
                                }
                            });
                        } else {
                            cli.throwHTTP(500, 'Error while updating ponglink', true);
                        }
                    }, false, true);
                });
            } else {
                cli.throwHTTP(400, 'A valid ponglink ID is required as url parameter', true);
            }
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
                        _id: { day : {$dayOfYear: "$at"}, year : {$year : "$at"} },
                        clicks: { $sum: 1 }
                    } },
                    { $project : {
                        day : "$_id.day", year : "$_id.year", clicks : 1, _id : 0 
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
                    ], versions => {
                        link.versions.forEach(version => {
                            const groupedVersion = versions.find(v => version.hash == v.version);
                            
                            if (groupedVersion) {
                                version.clicks = groupedVersion.clicks;
                            }
                        });
                        sendback({ link, daily, versions });
                    });
                });
            });
        } else if (levels[0] == "dashboard") {
            db.join(cli._c, 'ponglinks', [
                { $match : { status : 'active', clicks : { $gt : 5 } } },
                { $sort : { _id : -1 } },
                { $limit : 25 },
                { $sort : { clicks : -1 } },
                { $project : {
                    identifier : 1, _id : 1, createdAt : 1, 
                    creatorid : 1, clicks : 1
                } }
            ], arr => {
                sendback(arr);
            });
        } else {
            if (params.filters.search) {
                $match.identifier = new RegExp(params.filters.search, 'i');
            }

            if (params.filters.status) {
                $match.status = params.filters.status;
            }

            db.join(cli._c, 'ponglinks', [
                {$match},
                {$sort : {_id : -1}},
                {$skip : params.filters.skip || 0},
                {$limit : params.filters.limit || 30}
            ], (items) => {
                sendback({ items });
            });
        }
    }

    setup() {
        if (isElder) {
            log('Ponglinks', 'Elder process is storing links', 'info');
            const sites = require('../lib/config').getAllSites();
            sites.forEach(site => {
                db.findToArray(site, 'ponglinks', {}, (err, arr) => {
                    const set = {};
                    log('Ponglinks', 'Storing ' + arr.length + " links in shared cache", 'success');
                    arr.forEach(x => {
                        if (x.versions) {
                            x.versions.forEach(v => {
                                set["ponglinks_" + x.hash + (v.name || v.hash)] = v.destination;
                            });
                        }
                    });

                    sharedcache.set(set);
                });
            });
        }
    }
}

module.exports = new PongLinks();
