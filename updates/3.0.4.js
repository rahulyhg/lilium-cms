const db = require('../includes/db');
const contentlib = require('../content');
const log = require('../log');

module.exports = (_c, done) => {
    const next = cur => {
        cur.next((err, post) => {
            if (!post) {
                return done();
            }

            contentlib.fetchDeepFieldsFromDiff(_c, post, {
                diffs : [
                    { field : "media" },
                    { field : "topic" }
                ]
            }, () => {
                log('Update', 'Deep caching article with id ' + post._id + ' on site ' + _c.website.sitetitle, 'lilium');
                db.update(_c, 'content', {_id : post._id}, post, () => {
                    next(cur);
                })
            });
        });
    }

    db.rawCollection(_c, 'content', (err, col) => {
        next(col.find()); 
    });
};