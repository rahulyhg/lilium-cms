const db = require('../lib/db.js');

module.exports = (_c, done) => {
    db.createCollection(_c, 'apisessions');
    done();
};
