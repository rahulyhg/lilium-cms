const log = require('../log.js');
const db = require('../includes/db.js');
const config = require('../config.js');
const badges = require('../badges.js');
const articleLib = require('../article.js');

const DECO_COLLECTION = "decorations";
const ACTION_STATS_COLLECTION = "actionstats";
const BADGES_COLLECTION = "badges";

const compileArticle = (_c, cur, next, done) => {
    cur.hasNext((err, hasnext) => {
        hasnext ? cur.next((err, article) => {
            article.content ? articleLib.updateActionStats(_c, article, () => {
                next(_c, cur, next, done);
            }) : next(_c, cur, next, done);
        }) : done();
    });
}

module.exports = (_c, done) => {
    db.createCollections(config.default(), [DECO_COLLECTION, BADGES_COLLECTION, ACTION_STATS_COLLECTION], () => {
        db.find(_c, 'content', {status : "published"}, [], (err, cur) => {
            compileArticle(_c, cur, compileArticle, done);
        });
    });
};
