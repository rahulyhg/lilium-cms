const db = require('../includes/db.js');

module.exports = (conf, done) => {
    db.createCollections(conf, ["reports", "userclients", "usersessions", "pageviews", "userevents"], () => {
        db.createIndex(conf, 'userclients', {userid : 1}, () => {
            done();
        });
    });
};
