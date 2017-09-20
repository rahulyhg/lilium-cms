// 1.4.1
// Go through all articles with a "media" property defined
// Set all media credits in the "uploads" collection using article featuredcredit properties

const db = require('../includes/db');
const CONTENT_COLLECTION = "content";
const MEDIA_COLLECTION = "media";

const handleMedia = (article, done, _c) => {
    const mediaid = article.media;
    db.update(_c, 'uploads', { _id : mediaid }, {
        artistname : article.featuredimageartist,
        artisturl : article.featuredimagelink
    }, () => { done(); });
};

const nextArticle = (cur, done, _c) => {
    cur.hasNext((err, hasnext) => {
        if (hasnext) {
            cur.next((err, article) => {
                handleMedia(article, () => {
                    nextArticle(cur, done, _c);
                }, _c);
            });
        } else {
            done();
        }
    });
};

module.exports = (_c, done) => {
    db.find(_c, CONTENT_COLLECTION, { media : {$exists : 1} }, [], (err, cur) => {
        nextArticle(cur, done, _c);
    });
};
