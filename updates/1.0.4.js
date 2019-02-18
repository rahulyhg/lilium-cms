const db = require('../includes/db.js');


module.exports = (conf, done) => {
    log('Update', "Creating Fix collection", "lilium");
    db.createCollections(conf, ["fix", "fixcomm"], () => {
        done();
    });
};
