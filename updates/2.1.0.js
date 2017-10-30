const db = require('../includes/db');
const log = require('../log');

module.exports = (conf, done) => {
    let next = (cur) => {
        cur.hasNext((err, hasnext) => {
            if (hasnext) {
                cur.next((err, article) => {
                    article.content = article.content.split("<lml-page></lml-page>");
                    db.update(conf, 'content', {_id : article._id}, {content : article.content}, () => {
                    log("Update", "Updated article " + article.title, "lilium");
                        next(cur);
                    });
                });
            } else {
                done();
            }
        });
    };

    log("Update", "UPDATING TO NEW PAGINATION", "lilium");
    db.find(conf, 'content', {content : {$exists : 1}}, [], (err, cur) => {
        next(cur);
    }, {content : 1, title : 1, _id : 1});
};
