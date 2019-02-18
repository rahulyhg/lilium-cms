const db = require('../includes/db');


module.exports = (conf, done) => {
    let next = (cur) => {
        cur.hasNext((err, hasnext) => {
            if (hasnext) {
                cur.next((err, article) => {
                    article.facebooktitle = article.title && article.title[0];
                    article.facebooksubtitle = article.subtitle && article.subtitle[0];

                    db.update(conf, 'content', {_id : article._id}, {facebooktitle : article.facebooktitle, facebooksubtitle : article.facebooksubtitle}, () => {
                    log("Update", "Updated article " + article.title, "lilium");
                        next(cur);
                    });
                });
            } else {
                done();
            }
        });
    };

    log("Update", "UPDATING TO NEW FACEBOOK FIELD", "lilium");
    db.find(conf, 'content', {status : "published"}, [], (err, cur) => {
        next(cur);
    }, {content : 1, title : 1, subtitle : 1, _id : 1});
};
