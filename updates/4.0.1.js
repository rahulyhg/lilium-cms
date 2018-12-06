const db = require('../includes/db');

const handleArticleCursor = (col, cur, done) => {
    cur.next((err, article) => {
        if (!article) {
            log('Update', 'No more article to parse', 'success');
            return done();
        }

        if (article.fulltopic) {
            const v3url = "/" + article.fulltopic.completeSlug + "/" + article.name;

            log('Update', "V3 URL : " + v3url, 'detail');
            col.updateOne({ _id : article._id }, { v3url }, {}, () => {
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
        col.aggregate([
            { $match : { status : 'published' } },
            { $lookup : {
                from : "topics",
                as : "fulltopic", 
                localField : 'topic',
                foreignField : '_id'
            } },
            { $unwind : "$fulltopic" }
        ], (err, cur) => {
            log('Update', 'About to start the content cursor loop', 'info');
            handleArticleCursor(col, cur, () => {
                next();
            });
        });
    });
};

const merges = {};
const handleTopicCursor = (_c, col, cur, done) => {
    cur.next((err, topic) => {
        if (!topic) {
            return db.insert(_c, 'editions', Object.values(merges), () => {
                db.insert(_c, 'sections', {
                    displayname : "Level 0"
                }, () => {
                    done();
                });
            });
        }

        merges[topic.displayname] = merges[topic.displayname] || { 
            topicids : [],
            displayname : topic.displayname,
            lang : {
                en : {
                    displayname : topic.displayname
                }
            },
            level : 0
        };

        merges[topic.displayname].topicids.push(topic._id);

        setImmediate(() => handleTopicCursor(_c, col, cur, done));
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

const handleArticleCursor = (_c, cur, col, next) => {
    next();
}

const parseContentTopics = (_c, next) => {
    db.rawCollection(_c, 'content', {}, (err, col) => {
        col.aggregate([
            { $match : { status : 'published' } },
            { $lookup : {
                from : "topics",
                as : "fulltopic", 
                localField : 'topicfamily',
                foreignField : '_id'
            } },
        ], (err, cur) => {
            handleArticleCursor(_c, cur, col, () => next());
        });
    });
};

module.exports = (_c, done) => {
    storeV3URL(_c, () => {
        topicsToEditions(_c, () => {
            parseContentTopics(_c, () => {
                setImmediate(() => done());
            });
        });
    });
};

