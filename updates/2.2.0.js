const db = require('../includes/db');

module.exports = (conf, done) => {
    db.createCollection(conf, 'contenthistory', done);
};
