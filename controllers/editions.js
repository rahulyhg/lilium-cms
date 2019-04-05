const db = require('../lib/db');
const { updatePostsAfterMerge, fieldToRef, getFull } = require('../lib/editions');
const themelib = require('../lib/themes');
const hooks = require('../lib/hooks');

const EDITION_COLLECTION = "editions";
const SECTION_COLLECTION = "sections";

class EditionController {
    adminPOST(cli) {
        if (!cli.hasRight('manage-editions')) {
            return cli.refuse();
        }

        const act = cli.routeinfo.path[2];

        if (act == "merge") {
            // /merge/parent/futuremergee
            const parent = db.mongoID(cli.routeinfo.path[3]);
            const mergee = db.mongoID(cli.routeinfo.path[4]);

            log("Editions", "Merging " + mergee + " into " + parent, 'info');
            db.findUnique(cli._c, 'editions', { _id : parent }, (parentErr, parentDoc) => {
                db.findUnique(cli._c, 'editions', { _id : mergee }, (mergeeErr, mergeeDoc) => {
                    if (!mergeeDoc || !parentDoc) {
                        cli.sendJSON({ error : "Missing edition", errorcode : "noed", mergeeDoc, parentDoc, parentErr, mergeeErr })
                    } else if (mergeeDoc.level != parentDoc.level) {
                        cli.sendJSON({ error : "Cannot merge different levels", errorcode : "difflvl" })
                    } else {
                        db.update(cli._c, 'editions', { _id : mergee }, { active : false, merged : true, mergedinto : parent }, () => {
                            updatePostsAfterMerge(cli._c, mergeeDoc, parentDoc, mergeresult => {
                                cli.sendJSON({ mergeresult, parent, mergee });
                            });
                        });
                    }
                });
            });
        } else if (act == "create") {
            const { displayname, slug, level } = cli.postdata.data;
            if (!displayname || !slug) {
                return cli.throwHTTP(400, undefined, true);
            }
    
            const edition = {
                displayname, slugs : [slug], level, 
                active : true, lang : {}
            };

            const langconf = {
                displayname, slug, content : "", 
                icon : null, featuredimage : null
            };

            edition.lang.en = edition.lang.fr = langconf;

            db.insert(cli._c, 'editions', edition, () => {
                hooks.fireSite(cli._c, 'edition_created', { edition });
                cli.sendJSON({ edition });
            });
        } else if (act == "section") {
            const { displayname } = cli.postdata.data;

            if (!displayname) {
                return cli.throwHTTP(400, undefined, true);
            }
    
            db.aggregate(cli._c, 'sections', [
                { $sort : { level : -1 } },
                { $limit : 1 }
            ], arr => {
                const level = arr[0].level + 1;
                const section = { displayname, level };
                db.insert(cli._c, 'sections', section, () => {
                    cli.sendJSON({ section })
                });
            });
        } else if (act == "duplicate") {
            const toDup = db.mongoID(cli.routeinfo.path[3]);
            db.findUnique(cli._c, 'editions', { _id : toDup }, (err, original) => {
                if (err) {
                    cli.throwHTTP(500, err.toString(), true);
                } else if (!original) {
                    cli.throwHTTP(404, undefined, true);
                } else {
                    original.displayname += " (copy)";
                    original.slugs = [];

                    Object.keys(original.lang).forEach(lang => {
                        original.lang[lang].displayname = original.displayname;
                        original.lang[lang].slug = original.lang[lang].slug + "-" + Math.random().toString(16).substring(2);
                        original.slugs.push(original.lang[lang].slug);
                    });

                    db.insert(cli._c, 'editions', original, (err, r) => {
                        err ? cli.throwHTTP(500, err, true) : cli.sendJSON({
                            _id : original._id
                        });
                    });
                }
            }, { _id : 0 });
        } else if (act == "changelevel") {
            const ids = cli.postdata.data._ids.map(x => db.mongoID(x));
            if (cli.routeinfo.path[3] == "commit") {
                db.update(cli._c, 'editions', { _id : { $in : ids } }, { level : parseInt(cli.postdata.data.newlevel) }, () => {
                    let i = -1;
                    const nextgroup = () => {
                        const group = cli.postdata.data.groups[++i];

                        if (group) {
                            db.update(cli._c, 'content', 
                                { editions : group.ids.map(x => db.mongoID(x)) }, 
                                { editions : group.newassoc.map(x => db.mongoID(x)) }, 
                            (err, r) => {
                                log('Edition', `Updating assigned posts [${i}/${cli.postdata.data.groups.length}]`, 'detail');
                                setImmediate(() => nextgroup());
                            });
                        } else {
                            cli.sendJSON({ done : 1 });
                        }
                    };

                    setImmediate(() => nextgroup());
                });
            } else {
                db.aggregate(cli._c, 'content', [
                    { $match : { ["editions." + cli.postdata.data.originallevel] : { $in : ids } } },
                    { $group : { _id : "$editions", count : { $sum : 1 } } },
                    { $sort : { count : -1 } }
                ], groups => {
                    if (groups.length == 0) {
                        db.update(cli._c, 'editions', { _id : { $in : ids } }, {
                            level : parseInt(cli.postdata.data.newlevel)
                        }, () => {
                            cli.sendJSON({ changed : true })
                        });
                    } else {
                        cli.sendJSON({ groups, changed : false });
                    }
                });
            }
        } else if (act == "automergesimilar") {
            db.aggregate(cli._c, 'editions', [ 
                { $match : { active : true } },
                { $group : { 
                    _id : { displayname : "$lang.en.slug", level : "$level" }, 
                    total : { $sum : 1 }, 
                    parent : { $first : "$_id" },
                    mergees : { $push : "$_id" }
                } }, 
                { $match : { 
                    total : { $gt : 1 } 
                } },
                { $project : {
                    parent : 1,
                    mergees : 1
                } }
            ], arr => {
                if (cli.routeinfo.path[3] == "commit") {
                    const tasks = [];
                    arr.forEach(x => {
                        x.mergees.splice(1).forEach(mergee => tasks.push({ parent : x.parent, mergee, level : x._id.level }));
                    });

                    let taskCursor = -1;
                    const nextTask = () => {
                        const task = tasks[++taskCursor];
                        if (task) {
                            db.update(cli._c, 'editions', { _id : task.mergee }, { active : false, merged : true, mergedinto : task.parent }, () => {
                                updatePostsAfterMerge(cli._c, { _id : task.mergee, level : task.level }, { _id : task.parent, level : task.level }, () => {
                                    setImmediate(() => nextTask());
                                });
                            });
                        } else {
                            cli.sendJSON({ taskcount : tasks.length, tasks })
                        }
                    };

                    nextTask();
                } else {
                    cli.sendJSON(arr)
                }
            });
        } else {
            cli.throwHTTP(404, undefined, 'Unknown level ' + act);
        }
    }

    adminPUT(cli) {
        if (cli.hasRightOrRefuse('manage-editions')) {
            if (cli.routeinfo.path[2] == "nativefield") {
                cli.readPostData(payload => {
                    payload.value = fieldToRef(payload.name, payload.value);

                    db.findUnique(cli._c, 'editions', { _id : db.mongoID(cli.routeinfo.path[3]) }, (err, ed) => {
                        const newed = {
                            [`lang.${cli.routeinfo.path[4]}.${payload.name}`] : payload.value
                        };

                        if (payload.name == "slug") {
                            ed.lang[cli.routeinfo.path[4]].slug = payload.value;
                            newed.slugs = Array.from(new Set(Object.keys(ed.lang).map(l => ed.lang[l].slug)));
                        }

                        db.update(cli._c, 'editions', { _id : db.mongoID(cli.routeinfo.path[3]) }, newed, (err, r) => {
                            if (err) {
                                cli.throwHTTP(500, err, true);
                            } else {
                                hooks.fireSite(cli._c, 'edition_updated', { edition : Object.assign(ed, newed) });
                                cli.sendJSON(r)
                            }
                        });
                    });
                });
            } else if (cli.routeinfo.path[2] == "section") {
                const level = parseInt(cli.routeinfo.path[3]);
                cli.readPostData(payload => {
                    db.update(cli._c, 'sections', { level }, { displayname : payload.displayname }, () => {
                        cli.sendJSON({ level, displayname : payload.displayname });
                    });
                });
            } else if (cli.routeinfo.path[2] == "editionfield") {
                cli.readPostData(payload => {
                    const allowedfields = themelib.getEnabledTheme(cli._c).info.editionForm || [];
                    const field = allowedfields.find(x => x.name == payload.name);

                    if (field) {
                        const upd = {
                            [`lang.${cli.routeinfo.path[3]}.${payload.name}`] : field.ref ? db.mongoID(payload.value) : payload.value
                        };

                        db.update(cli._c, 'editions', { _id : { $in : payload.ids.map(x => db.mongoID(x)) } }, upd, (err, r) => {
                            if (err) {
                                cli.throwHTTP(500, err, true);
                            } else {
                                db.findUnique(cli._c, 'editions', { _id : { $in : payload.ids.map(x => db.mongoID(x)) } }, (err, editions) => {
                                    hooks.fireSite(cli._c, 'editions_updated', { editions });
                                    cli.sendJSON(r)
                                });
                            }
                        });
                    } else {
                        cli.throwHTTP(401, undefined, true);
                    }
                });
            } else if (cli.routeinfo.path[2] == "mergelanguages") {
                const _id = db.mongoID(cli.routeinfo.path[3]);
                db.findUnique(cli._c, 'editions', { _id }, (err, edition) => {
                    if (!edition) {
                        return cli.throwHTTP(404, undefined, true);
                    }

                    cli.readPostData(payload => {
                        edition.lang[payload.mergeInto] = edition.lang[payload.mergeFrom];
                        db.update(cli._c, 'editions', { _id }, edition, (err, r) => {
                            err ? cli.throwHTTP(500, err, true) : cli.sendJSON(r);
                        });
                    });
                });
            } else {
                cli.throwHTTP(404, undefined, true);
            }
        }
    }

    adminDELETE(cli) {
        if (cli.hasRightOrRefuse('manage-editions')) {
            if (cli.routeinfo.path[2] == "replacewith") {
                const replaceWith = db.mongoID(cli.routeinfo.path[3]);

                cli.readPostData(payload => {
                    if (!payload || !payload.toDelete) {
                        return cli.throwHTTP(400, undefined, true);
                    }

                    const ids = payload.toDelete.map(x => db.mongoID(x));
                    db.findUnique(cli._c, 'editions', { _id : ids[0] }, (err, edition) => {
                        if (!edition) {
                            return cli.throwHTTP(404, undefined, true);
                        }

                        const level = edition.level;
                        db.update(cli._c, 'editions', { _id : { $in : ids } }, { active : false }, () => {
                            db.update(cli._c, 'content', { ["editions." + level] : { $in : ids } }, {
                                ["editions." + level] : replaceWith
                            }, (err, r) => {
                                err ? cli.throwHTTP(500, err, true) : cli.sendJSON(r);
                            });
                        });
                    });
                });
            } else {
                cli.throwHTTP(404, undefined, true);
            }
        }
    }

    serveOrFallback(cli, sendback) {
        log('Editions', "TODO : Implement serveOrFallback", 'warn');
        sendback();
    }

    livevar(cli, levels, params, done) {
        const act = levels[0];

        if (act == "level") {
            db.findToArray(cli._c, 'editions', { level : parseInt(levels[1]), active : true }, (err, eds) => {
                done(eds);
            });
        } else if (act == "full") {
            getFull(db.mongoID(levels[1]), ed => done(ed));
        } else if (act == "all") {
            db.findToArray(cli._c, 'sections', {}, (err, sections) => {
                db.join(cli._c, 'editions', [
                    { $match : { active : true } },
                    { $group : { _id : "$level", editions : { $push : "$$ROOT" } } },
                    { $lookup : { from : 'sections', as : 'section', localField : '_id', foreignField : 'level' } },
                    { $unwind : "$section" },
                    { $project : { 
                        _id : 0,
                        level : "$_id", 
                        "section" : 1,
                        "editions._id" : 1,
                        "editions.slugs" : 1,
                        "editions.lang" : 1
                    } },
                    { $sort : { level : 1 } }
                ], levels => {
                    if (levels.length != sections.length) {
                        for (let i = levels.length; i < sections.length; i++) {
                            levels.push({
                                section : sections[i],
                                level : i,
                                editions : []
                            })
                        }
                    }

                    done({ levels, sections });
                });
            });
        } else {
            done({ error : "Unknown level " + act });
        }
    }
}

module.exports = new EditionController();
