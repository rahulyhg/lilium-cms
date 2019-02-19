const db = require('../lib/db');

module.exports = (conf, done) => {
    db.createCollection(conf, 'contenthistory', done);
};
