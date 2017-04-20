const db = require('../includes/db.js');
const log = require('../log.js');

module.exports = (conf, done) => {
    log('Update', "Creating Fix collection", "lilium");
    db.createCollections(conf, ["fix", "fixcomm"], () => {
        done();
    });
};
