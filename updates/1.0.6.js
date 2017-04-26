const db = require('../includes/db.js');
const log = require('../log.js');

module.exports = (conf, done) => {
    log('Update', "Creating Instagram collection", "lilium");
    db.createCollections(conf, ["instagram", "instagramstats"], () => {
        done();
    });
};
