const db = require('../lib/db.js');


module.exports = (conf, done) => {
    log('Update', "Creating Instagram collection", "lilium");
    db.createCollections(conf, ["ipevents"], () => {
        done();
    });
};
