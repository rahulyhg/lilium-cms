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

    }

    adminDELETE(cli) {
        
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
            db.findToArray(cli._c, 'editions', { active : true }, (err, eds) => {
                done(eds);
            }, {
                displayname : 1, slug : 1, level : 1
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
