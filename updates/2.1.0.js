const db = require('../lib/db');


module.exports = (conf, done) => {
    let next = (cur) => {
        cur.next((err, article) => {
            if (!article) {
                return done();
            }

            article.content = article.content && article.content.split ? article.content.split("<lml-page></lml-page>") : (article.content || []);
            article.title = new Array(article.content.length).fill(article.title);
            article.subtitle = new Array(article.content.length).fill(article.subtitle); 

            db.update(conf, 'content', {_id : article._id}, {content : article.content, title : article.title, subtitle : article.subtitle}, () => {
            log("Update", "Updated article " + article.title, "lilium");
                next(cur);
            });
        });
    };

    log("Update", "UPDATING TO NEW PAGINATION", "lilium");
    db.find(conf, 'content', {content : {$exists : 1}}, [], (err, cur) => {
        next(cur);
    }, {content : 1, title : 1, subtitle : 1, _id : 1});
};
