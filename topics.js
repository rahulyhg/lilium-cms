const log = require('./log.js');
const hooks = require('./hooks.js');
const db = require('./includes/db.js');
const livevars = require('./livevars.js');
const filelogic = require('./filelogic.js');
const Admin = require('./backend/admin.js');

class LMLTopics {
    livevar(cli, levels, params, send) {
        if (levels[0] == "all") {
            db.findToArray(cli._c, 'topics', {active : true}, (err, topicsArray) => {
                let assoc = {};
                for (var i = 0; i < topicsArray.length; i++) {
                    assoc[topicsArray[i]._id] = topicsArray[i];
                    topicsArray[i].children = [];
                }

                let resp = {};
                let respArray = [];
                for (var i = 0; i < topicsArray.length; i++) {
                    if (topicsArray[i].parent) {
                        assoc[topicsArray[i].parent].children.push(topicsArray[i]);
                    } else {
                        respArray.push(topicsArray[i]);
                    }
                }

                send(respArray);
            });
        } else if (levels[0] == "ofcategory") {
            db.findToArray(cli._c, 'topics', { category : levels[1], active : true }, (err, arr) => {
                send(arr);
            }, { displayname : 1, slug : 1, description : 1, completeSlug : 1 });
        } else if (levels[0] == "childof") {
            db.findToArray(cli._c, 'topics', { parent : db.mongoID(levels[1]), active : true }, (err, arr) => {
                send(arr);
            }, { displayname : 1, slug : 1, description : 1, completeSlug : 1 });
        } else if (levels[0] == "simple") {
            db.findToArray(cli._c, 'topics', { active : true }, (err, topics) => {
                send(topics);
            }, { _id : 1, displayname : 1, slug : 1, completeSlug : 1, parent : 1, category : 1 });
        } else if (levels[0] == "category") {
            db.join(cli._c, 'topics', [
                { $match : { active : true, parent : { $exists : false }, category : { $exists : true } } },
                { $project : { category : 1 } }
            ], topics => {
                cli.sendJSON(Array.from(new Set(topics.map(x => x.category))));
            });
        } else if (levels[0] == "tablepicker") {
            db.findToArray(cli._c, 'topics', { active : true }, (err, arr) => {
                const assoc = {};
                arr.forEach(x => { assoc[x._id] = x; });

                send(arr);
            }, { displayname : 1, parent : 1 });
        } else if (levels[0] == "treename") {
            db.findToArray(cli._c, 'topics', {active : true}, (err, topicsArray) => {
                let assoc = {};
                let resp = [];
                for (var i = 0; i < topicsArray.length; i++) {
                    assoc[topicsArray[i]._id] = topicsArray[i];
                    topicsArray[i].children = [];
                }

                for (let i = 0; i < topicsArray.length; i++) {
                    let treename = topicsArray[i].displayname;
                    let par = assoc[topicsArray[i].parent];

                    while(par) {
                        treename = par.displayname + " > " + treename;
                        par = assoc[par.parent];
                    }

                    resp.push({
                        _id : topicsArray[i]._id,
                        treename : treename
                    });
                }

                send(resp);
            });
        } else if (levels[0] == "get") {
            let topicID = levels[1];
            db.findUnique(cli._c, 'topics', {_id : db.mongoID(topicID), active : true}, (err, single) => {
                single ? db.findToArray(cli._c, 'topics', {parent : single._id, active : true}, (cErr, children) => {
                    single.children = children;
                    single.override = single.override || {};

                    single.parent ? db.findUnique(cli._c, 'topics', {_id : single.parent}, (err, par) => {
                        single.parent = par;
                        send(single);
                    }) : send(single);
                }) : send();
            });
        } else {
            send(new Error("LivevarException - Undefined first level " + levels[0]));
        }
    }

    adminGET(cli) {
        if (!cli.hasRight('manage-topics')) {
            return cli.throwHTTP(401);
        }

        let firstLevel = cli.routeinfo.path[2];
        if (!firstLevel) {
            filelogic.serveAdminLML(cli);
        } else if (firstLevel == "edit") {
            filelogic.serveAdminLML(cli, true);
        } else {
            cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {
        if (!cli.hasRight('manage-topics')) {
            return cli.throwHTTP(401);
        }

        if (cli.routeinfo.path[2] == "add") {
            let newTopic = cli.postdata.data;

            if (newTopic && newTopic.displayname) {
                if (newTopic.parent) {
                    newTopic.parent = db.mongoID(newTopic.parent);
                } else {
                    delete newTopic.parent;
                }

                newTopic.slug = require('slug')(newTopic.displayname).toLowerCase();
                newTopic.active = true;
                db.insert(cli._c, 'topics', newTopic, (err, r) => {
                    this.updateFamily(cli._c, newTopic._id, newTopic.slug, () => {
                        this.generateFamilyEntry(cli._c, newTopic._id, () => {

                            hooks.fireSite(cli._c, 'topicCreated', {topic : newTopic})
                            cli.sendJSON({
                                created : true,
                                _id : r.insertedId,
                                reason : "Valid form"
                            });
                        });
                    });
                });
            } else {
                cli.sendJSON({
                    created : false,
                    reason : "Missing fields"
                });
            }
        } else if (cli.routeinfo.path[2] == "edit") {
            let updatedTopic = cli.postdata.data;
            let topicID = db.mongoID(cli.routeinfo.path[3]);
            
            if (updatedTopic && updatedTopic.displayname && updatedTopic.slug && topicID) {
                db.update(cli._c, 'topics', {_id : topicID}, updatedTopic, (() => {
                    this.updateFamily(cli._c, topicID, updatedTopic.slug, () => {
                        hooks.fireSite(cli._c, 'topicUpdated', {topic : updatedTopic})

                        cli.sendJSON({
                            updated : true,
                            reason : "Valid form"
                        });
                    });
                }).bind(this));
            } else {
                cli.sendJSON({
                    created : false,
                    reason : "Missing fields"
                });
            }
        } else if (cli.routeinfo.path[2] == "editoverride") {
            let inputdata = cli.postdata.data;
            let topicID = db.mongoID(cli.routeinfo.path[3]);
            
            let realdata = {};
            for (let k in inputdata) if (inputdata[k] && (inputdata[k].length != 0 || typeof inputdata[k] != "object")) {
                realdata[k] = inputdata[k];
            }

            if (topicID) {
                db.update(cli._c, 'topics', {_id : topicID}, {override : realdata}, (() => {                        
                    hooks.fireSite(cli._c, 'topicOverrideUpdated', {override : realdata, _id : topicID})

                    cli.sendJSON({
                        updated : true,
                        reason : "Valid form",
                        fields : Object.keys(realdata).length
                    });
                }).bind(this));
            } else {
                cli.sendJSON({
                    created : false,
                    reason : "Missing fields"
                });
            }
        } else {
            cli.throwHTTP(404);
        }
    }

    adminPUT(cli) {
        if (!cli.hasRight('manage-topics')) {
            return cli.throwHTTP(401);
        }

        if (!cli.routeinfo.path[2]) {
            return cli.throwHTTP(401);
        }

        const _id = db.mongoID(cli.routeinfo.path[2]);
        cli.readPostData(data => {
            db.update(cli._c, 'topics', { _id }, { [data.field] : data.value }, (err, r) => {
                cli.sendJSON({ ok : !err && r.modifiedCount });
            });
        });
    }

    serveOrFallback(cli, fallback) {
        const that = this;
        let completeSlug = cli.routeinfo.fullpath;
        if (completeSlug[0] == "/") {
            completeSlug = completeSlug.substring(1);
        }

        let maybeIndex = completeSlug.split('/');
        if (!isNaN(maybeIndex[maybeIndex.length - 1])) {
            let realIndex = maybeIndex.pop();
            completeSlug = maybeIndex.join('/');
            
            maybeIndex = parseInt(realIndex);
        } else {
            maybeIndex = 1;
        }

        if (isNaN(maybeIndex)) {
            maybeIndex = 1;
        }

        db.findUnique(cli._c, 'topics', {completeSlug : completeSlug}, ((err, topic) => {
            if (err || !topic) {
                fallback();
            } else {
                this.deepFetch(cli._c, topic._id, ((topic) => {
                    if (require('./endpoints.js').contextualIsRegistered(cli._c.id, 'topic', 'GET')) {
                        require('./endpoints.js').executeContextual('topic', 'GET', cli, {
                            topic : topic, 
                            index : maybeIndex
                        });
                    } else {
                        let template = topic.archivetemplate || "topic";
                        require('./filelogic.js').renderThemeLML(cli, template, completeSlug + ".html", {topic : topic}, (content) => {
                            cli.response.writeHead(200);
                            cli.response.end(content);
                        });
                    }
                }).bind(this));
            }
        }).bind(this), {_id : 1});
    }

    refreshTopicsSlugs(conf, done) {
        const that = this;
        db.findToArray(conf, 'topics', {}, (err, arr) => {
            let index = -1;
            const next = () => {
                index++;
                if (index == arr.length) {
                    done();
                } else {
                    that.updateFamily(conf, arr[index]._id, arr[index].slug, next);
                }
            };      
            next();
        }, {_id : 1, slug : 1});
    }

    generateFamilyEntry(conf, _id, sendback) {
        let arr = [_id];
        let oid = _id;
        let that = this;

        let nextParent = () => {
            db.findUnique(conf, 'topics', {_id}, (err, t) => {
                if (t.parent) {
                    arr.push(t.parent);
                    _id = t.parent;
                    nextParent();
                } else {
                    db.update(conf, 'topics', {_id : oid}, {family : arr}, sendback.bind(that));
                }
            });
        };

        nextParent();
    }

    hashtopic(_id) {
        return require('crypto-js').SHA256(_id).toString();
    }

    generateTopicLatestJSON(conf, _id, sendback, max = 6) {
        db.join(conf, 'content', [
            {
                $match : {
                    topic : _id,
                    status : "published",
                    media : {$exists : 1}
                }
            }, {
                $sort : {date : -1}
            }, {
                $limit : max
            }, {
                $project : {
                    _id : 0,
                    title : 1,
                    subtitle : 1,
                    media : 1,
                    name : 1,
                    isSponsored : 1
                }
            }, {
                $lookup : {
                    from : "uploads",
                    localField : "media",
                    foreignField : "_id",
                    as : "featuredimage"
                }
            }
        ], (articles) => {

            db.findUnique(conf, 'topics', {_id}, (err, topic) => {
                articles.forEach(a => {
                    if (a.featuredimage[0]) {
                        a.featuredimage = require('./cdn.js').parseOne(conf, a.featuredimage[0].sizes.thumbnailarchive && a.featuredimage[0].sizes.thumbnailarchive.url || (conf.server.url + "/uploads/" + a.featuredimage[0].url));
                        a.url = conf.server.url + "/" + topic.completeSlug + "/" + a.name;
                        a.media = undefined;
                        a.title = a.title[0];
                        a.subtitle = a.subtitle[0];
                    } else {
                        a.skip = true;
                    }
                });

                let hash = topicLib.hashtopic(_id.toString());
                let generatedOn = new Date();
                topic = {
                    completeSlug : topic.completeSlug, 
                    displayname : topic.displayname,
                    url : conf.server.url + "/" + topic.completeSlug
                };

                let resp = { articles, topic, hash, generatedOn };

                log('Topics', "Creating topic latest JSON file for : " + topic.displayname);
                log("Topics", "Topic " + topic.displayname + " hash is " + hash, "detail");
                require('./fileserver.js').dumpToFile(
                    conf.server.html + "/topic_latests_" + hash + ".json", 
                    JSON.stringify(resp),
                    () => {
                        sendback && sendback(resp);
                    },
                    'utf8'
                );
            });
        });
    }

    getFamilyIDs(conf, _id, sendback) {
        if (typeof _id !== "object") {
            throw new Error("Topics.getFamilyIds id parameter must be a Mongo Identifier object");
        }

        let family = [_id];
        let getChildrenOf = (_id, finished) => {
            db.findToArray(conf, 'topics', { parent : _id }, (err, children) => {
                let index = -1;
                let workOne = () => {
                    index++;
                    if (index == children.length) {
                        finished(family);
                    } else {
                        family.push(children[index]._id);
                        getChildrenOf(children[index]._id, workOne);
                    }
                };

                workOne();
            });
        };

        getChildrenOf(_id, sendback);
    }

    batchDeepFetch(conf, ids, send) {
        let index = -1;
        const results = {};
        const next = () => {
            if (++index == ids.length) {
                return send(results);
            }

            this.deepFetch(conf, ids[index], deeptopic => {
                results[ids[index]] = deeptopic;
                next();
            });
        };

        next()
    }

    deepFetch(conf, slugOrId, send) {
        let conds = {};
        if (!slugOrId) {
            return send(undefined, []);
        } else if (typeof slugOrId == "object") {
            conds._id = slugOrId._id || slugOrId;
        } else if (slugOrId.indexOf && slugOrId.indexOf("/") == -1) {
            conds.slug = slugOrId;
        } else {
            conds.completeSlug = slugOrId;
        }

        let parents = [];
        let getParents = (done) => {
            db.findUnique(conf, 'topics', conds, (err, tobj) => {
                if (!tobj) {
                    done();
                } else {
                    tobj.hash = topicLib.hashtopic(tobj._id.toString());
                    parents.unshift(tobj);
                    if (tobj.parent) {
                        conds = {_id : tobj.parent};
                        getParents(done);
                    } else  {
                        done();
                    }
                }
            });
        };

        // Get arbo, then merge settings from children to parent
        getParents(() => {
            let finalTopic = {override : {}};
            for (let i = 0; i < parents.length; i++) {
                let curt = parents[i];
                for (let k in curt) {
                    if (k == "override") {
                        for (let ok in curt.override) if (curt.override[ok]) { 
                            finalTopic.override[ok] = curt.override[ok];
                        }
                    } else {
                        finalTopic[k] = curt[k];
                    }
                }
            }

            hooks.fireSite(conf, 'topicDeepFetch', {topic : finalTopic, parents})
            send(finalTopic, parents.reverse());
        });
    }

    portCategories(conf, done) {
        log("Topics", "Porting categories to topics");
        db.find(conf, 'categories', {}, [], (err, cur) => {
            db.all(cur, (cat, next) => {
                log("Topics", "Porting category : " + cat.displayname);
                db.insert(conf, 'topics', {
                    slug : cat.name, 
                    completeSlug : cat.name,
                    displayname : cat.displayname,
                    description : cat.displayname, 
                    active : true
                }, (err, r) => {
                    let tID = r.insertedID;
                    db.update(conf, 'content', {categories : [cat.name]}, {topics : tID}, () => {
                        next();
                    });
                });
            }, (total) => {
                log("Topics", "Done porting categories, total of : " + total, "success");
                done();
            });
        });
    }

    updateFamily(conf, _id, newSlug, callback) {
        const getParentArray = (parentobject, done) => {
            let pArray = [];
            
            const request = () => {
                if (parentobject.parent) {
                    db.findUnique(conf, 'topics', {_id : parentobject.parent}, (err, par) => {
                        pArray.push(par.slug);
                        parentobject = par;
                        request();
                    });
                } else {
                    done(pArray);
                }
            };
            
            request();
        };

        const affectChildren = (childid, parentSlug, done) => {
            db.findUnique(conf, 'topics', {_id : childid}, (err, topic) => {
                parentSlug = (parentSlug ? parentSlug + "/" : "") + topic.slug;
                db.update(conf, 'topics', {_id : childid}, {completeSlug : parentSlug}, () => {
                    // Find children, recur
                    db.findToArray(conf, 'topics', {parent : childid}, (err, array) => {
                        let childIndex = -1;
                        const nextChild = () => {
                            childIndex++;
                            if (array.length == childIndex) {
                                done();
                            } else {
                                affectChildren(array[childIndex]._id, parentSlug, nextChild);
                            }
                        };

                        nextChild();
                    });
                });
            });
        };

        db.findUnique(conf, 'topics', {_id : _id}, (err, topic) => {
            getParentArray(topic, (parentArray) => {
                let parentSlug = parentArray.reverse().join('/');
                affectChildren(_id, parentSlug, () => {
                    callback();
                });
            });
        });
    }
}

const topicLib = new LMLTopics();
module.exports = topicLib
