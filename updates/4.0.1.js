const db = require('../includes/db');

const topicDeepFetch = (conf, _id, send) => {
    let parents = [];
    let conds = {_id}
    let getParents = (done) => {
        db.findUnique(conf, 'topics', conds, (err, tobj) => {
            if (!tobj) {
                done();
            } else {
                tobj.hash = require('crypto-js').SHA256(tobj._id).toString(); 
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

        send(finalTopic, parents.reverse());
    });
}

const TOPICS = {};
const loadAllTopicCombos = (_c, done) => {
    db.find(_c, 'topics', {}, [], (err, cur) => {
        const next = () => {
            cur.next((err, topic) => {
                if (topic) {
                    topicDeepFetch(_c, topic._id, fulltopic => {
                        topic.override = Object.assign(topic.override || {}, fulltopic.override || {});
                        TOPICS[topic._id.toString()] = topic;

                        log('Update', 'Deep fetched topic ' + topic._id, 'detail');
                        setImmediate(() => next());
                    });
                } else {
                    done();
                }
            });
        };

        next();
    });
};

const handleArticleCursor = (col, cur, done) => {
    cur.next((err, article) => {
        if (!article) {
            log('Update', 'No more article to parse', 'success');
            return done();
        }

        if (article.topic) {
            const v3url = "/" + TOPICS[article.topic.toString()].completeSlug + "/" + article.name;
            const language = (TOPICS[article.topic.toString()].override.language || "en-ca").substring(0, 2);

            log('Update', "V3 URL : " + v3url + ' with language ' + language, 'detail');
            col.updateOne({ _id : article._id }, { $set : { v3url, url : v3url, wordcount : article.contractorTotalWords || 0, language } }, {}, () => {
                setImmediate(() => handleArticleCursor(col, cur, done));
            });
        } else {
            log('Update', "Article without a topic : " + article._id, 'detail');
            setImmediate(() => handleArticleCursor(col, cur, done));
        }
    });
};

const storeV3URL = (_c, next) => {
    db.rawCollection(_c, 'content', {}, (err, col) => {
        log('Update', 'Running content collection aggregate', 'info');
        col.find({ status : 'published' }, (err, cur) => {
            log('Update', 'About to start the content cursor loop', 'info');
            handleArticleCursor(col, cur, () => {
                next();
            });
        });
    });
};

let maximumLevel = 0;
const handleTopicCursor = (_c, col, cur, done) => {
    cur.next((err, topic) => {
        if (!topic) {
            const sects = new Array(maximumLevel).fill(0).map((x, i) => ({ displayname : "Level " + (i+1), level : i }));

            return db.insert(_c, 'sections', sects, () => {
                done();
            });
        }

        log('Update', 'Parsing topic ' + topic.displayname + " /" + topic.completeSlug, 'detail');
        const merge = { 
            topicid : topic._id,
            active : true,
            oldtopicslug : topic.slug,
            oldtopiccompleteslug : topic.completeSlug,
            oldtopicfamily : topic.family,
            displayname : topic.displayname,
            slugs : [topic.slug],
            lang : {
                en : {
                    displayname : topic.displayname,
                    slug : topic.slug,
                    description : topic.description || ""
                },
                fr : {
                    displayname : topic.displayname,
                    slug : topic.slug,
                    description : topic.description || ""
                }
            },
            level : topic.family.length - 1
        };

        maximumLevel = maximumLevel > topic.family.length ? maximumLevel : topic.family.length;

        db.insert(_c, 'editions', merge, () => {
            setImmediate(() => handleTopicCursor(_c, col, cur, done));
        });
    });
};

const topicsToEditions = (_c, next) => {
    db.rawCollection(_c, 'topics', {}, (err, col) => {
        db.remove(_c, 'editions', {}, () => {
            db.remove(_c, 'sections', {}, () => {
                col.aggregate([
                    { $match : { active : { $ne : false } } }
                ], (err, cur) => {
                    handleTopicCursor(_c, col, cur, () => next());
                });
            });
        });
    });
};

const handleContentCursor = (_c, cur, col, next) => {
    cur.next((err, post) => {
        if (!post) {
            return next();
        }

        const editions = post.fulledition.map(x => x._id);
        log('Update', 'Setting edition to post with id ' + post._id, 'info');
        db.update(_c, 'content', { _id : post._id }, { editions }, () => setImmediate(() => handleContentCursor(_c, cur, col, next)));
    });
}

const parseContentTopics = (_c, next) => {
    db.rawCollection(_c, 'content', {}, (err, col) => {
        col.aggregate([
            { $match : { topicfamily : { $exists : 1 } } },
            { $lookup : {
                from : "topics", as : "fulltopic", 
                localField : 'topicfamily', foreignField : '_id'
            } },
            { $lookup : {
                from : 'editions', as : 'fulledition',
                localField : 'fulltopic._id', foreignField : 'topicid'
            } },
            { $project : {
                _id : 1,
                "fulledition._id" : 1,
            } }
        ], (err, cur) => {
            handleContentCursor(_c, cur, col, () => next());
        });
    });
};

const createIndices = (_c, next) => {
    db.rawCollection(_c, 'content', {}, (err, col) => {
        log('Update', 'Dropping already existing text index on content.title', 'info');
        col.dropIndex('title_text', {}, () => {
            log('Update', 'Creating text indexes on tags, title, subtitle, content', 'info');
            db.createIndex(_c, 'content', {
                tags: 'text',
                title: 'text',
                subtitle: 'text',
                content: 'text'
            }, () => {
                next && next();
            }, {
                weights: {
                    content: 16,
                    title: 12,
                    subtitle: 6,
                    tags: 4
                }
            });
        });
    });
};

module.exports = (_c, done) => {
    loadAllTopicCombos(_c, () => {
        storeV3URL(_c, () => {
            topicsToEditions(_c, () => {
                parseContentTopics(_c, () => {
                    createIndices(_c, () => {
                        setImmediate(() => done());
                    });
                });
            });
        });
    });
};

