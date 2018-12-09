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

let maximumLevel = 0;
const handleTopicCursor = (_c, col, cur, done) => {
    cur.next((err, topic) => {
        if (!topic) {
            const sects = new Array(maximumLevel).fill(0).map((x, i) => ({ displayname : "Level " + i, level : i }));

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
            slug : topic.slug,
            lang : {
                en : {
                    displayname : topic.displayname,
                    slug : topic.slug
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

module.exports = (_c, done) => {
    storeV3URL(_c, () => {
        topicsToEditions(_c, () => {
            parseContentTopics(_c, () => {
                setImmediate(() => done());
            });
        });
    });
};

