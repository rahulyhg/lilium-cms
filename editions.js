const db = require('./includes/db');

const EDITION_COLLECTION = "editions";
const SECTION_COLLECTION = "sections";

function updatePostsAfterMerge(_c, then, now, done) {
    let ctn = 0;
    const processOnePost = cur => {
        cur.next((err, post) => {
            if (!post) {
                log("Editions", "Updated " + ctn + " posts after merging", "success");
                return done({ postupdated : ctn });
            }

            ctn++;
            post.editions[then.level] = now._id;
            db.update(_c, 'content', { _id : post._id }, { editions : post.editions }, () => setImmediate(() => processOnePost(cur)));
        });
    }

    db.find(_c, 'content', { editions : then._id }, [], (err, cur) => processOnePost(cur));
}

function fieldToRef(field, value) {
    return field == "icon" || field == "featuredimage" ? db.mongoID(value) : value;
}

class EditionController {
    adminPOST(cli) {
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
        } else if (act == "duplicate") {
            const toDup = db.mongoID(cli.routeinfo.path[3]);
            db.findUnique(cli._c, 'editions', { _id : toDup }, (err, original) => {
                if (err) {
                    cli.throwHTTP(500, err.toString(), true);
                } else if (!original) {
                    cli.throwHTTP(404, undefined, true);
                } else {
                    original.displayname += " (copy)";
                    original.slug += "-" + Math.random().toString(16).substring(2);

                    Object.keys(original.lang).forEach(lang => {
                        original.lang[lang].displayname = original.displayname;
                        original.lang[lang].slug = original.slug;
                    });

                    db.insert(cli._c, 'editions', original, (err, r) => {
                        err ? cli.throwHTTP(500, err, true) : cli.sendJSON({
                            _id : original._id
                        });
                    });
                }
            }, { _id : 0 });
        } else if (act == "automergesimilar") {
            db.aggregate(cli._c, 'editions', [ 
                { $match : { active : true } },
                { $group : { 
                    _id : { displayname : "$displayname", level : "$level" }, 
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

                    db.update(cli._c, 'editions', { _id : db.mongoID(cli.routeinfo.path[3]) }, {
                        [`lang.${cli.routeinfo.path[4]}.${payload.name}`] : payload.value
                    }, (err, r) => {
                        if (err) {
                            cli.throwHTTP(500, err, true);
                        } else {
                            cli.sendJSON(r)
                        }
                    });
                });
            } else if (cli.routeinfo.path[2] == "editionfield") {
                cli.readPostData(payload => {
                    payload.value = fieldToRef(payload.name, payload.value);

                    db.update(cli._c, 'editions', { _id : { $in : payload.ids.map(x => db.mongoID(x)) } }, {
                        [`lang.${cli.routeinfo.path[3]}.${payload.name}`] : payload.value
                    }, (err, r) => {
                        if (err) {
                            cli.throwHTTP(500, err, true);
                        } else {
                            cli.sendJSON(r)
                        }
                    });

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

    getFull(_id, sendback) {
        db.findUnique(cli._c, 'editions', { _id }, (err, ed) => {
            sendback(ed);
        });
    }

    livevar(cli, levels, params, done) {
        const act = levels[0];

        if (act == "level") {
            db.findToArray(cli._c, 'editions', { level : parseInt(levels[1]), active : true }, (err, eds) => {
                done(eds);
            });
        } else if (act == "full") {
            this.getFull(db.mongoID(levels[1]), ed => done(ed));
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
                        "editions.slug" : 1,
                        "editions.displayname" : 1,
                        "editions.lang" : 1
                    } },
                    { $sort : { level : 1 } }
                ], levels => {
                    done({ levels, sections });
                });
            });
        } else {
            done({ error : "Unknown level " + act });
        }
    }
}

module.exports = new EditionController();

/*
 * A section has multiple editions, a name, and a lebel index
 * An article has an array of editions
 *
 * Section {
 *   _id : ObjectId,
 *   index : Number, index 0
 *   displayname : {
 *     lang_code : String, 
 *     ...
 *   }
 * }
 *
 * Edition {
 *   _id : ObjectId,
 *   displayname : {
 *     lang_code : String,
 *     ...
 *   },
 *   slug : {
 *     lang_code : String
 *   }
 * }
 *
 */
