const db = require('../includes/db');

const handleArticleCursor = (col, cur, done) => {
    cur.next((err, article) => {
        if (!article) {
            return done();
        }

        if (article.fulltopic) {
            const v3url = "/" + article.fulltopic.completeSlug + "/" + article.name;

            console.log(v3url);
            col.updateOne({ _id : article._id }, { v3url }, {}, () => {
                setImmediate(() => handleArticleCursor(col, cur, done));
            });
        } else {
            setImmediate(() => handleArticleCursor(col, cur, done));
        }
    });
};

const storeV3URL = (_c, next) => {
    db.rawCollection(_c, 'content', {}, (err, col) => {
        col.aggregate([
            { $match : { status : 'published' } },
            { $lookup : {
                from : "topics",
                as : "fulltopic", 
                localField : 'topic',
                foreignField : 'topic'
            } },
            { $unwind : "$fulltopic" }
        ], (err, cur) => {
            handleArticleCursor(col, cur, () => {
                next();
            });
        });
    });
};

const levels = [];
const handleTopicCursor = (col, cur, done) => {
    cur.next((err, topic) => {
        if (!topic) {
            return done();
        }

        
    });
};

const topicsToEditions = (_c, next) => {
    db.rawCollection(_c, 'topics', {}, (err, col) => {
        db.remove(_c, 'editions', {}, () => {
            db.remove(_c, 'sections', {}, () => {
                col.aggregate([
                    { $match : { active : { $ne : false } } }
                ], (err, cur) => {
                    handleTopicCursor(col, cur, () => next());
                });
            });
        });
    });
};

const updateScript = (_c, done) => {
    storeV3URL(_c, () => {
        topicsToEditions(_c, () => {
            setImmediate(() => done());
        });
    });
};

module.exports = updateScript;
