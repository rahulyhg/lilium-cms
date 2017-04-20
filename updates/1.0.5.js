const db = require('../includes/db.js');
const log = require('../log.js');

module.exports = (conf, done) => {
    log('Update', "Updating NSFW articles", "lilium");
    db.update(conf, "content", {tags : "nsfw"}, {nsfw : true}, () => {
        db.update(conf, "content", {tags : "NSFW"}, {nsfw : true}, () => {
            db.update(conf, "content", {nsfw : {$ne : true}}, {nsfw : false}, () => {
                done();
            });
        });
    });
};
