const log = require('../log.js');
const db = require('../includes/db.js');

module.exports = (_c, done) => {
    db.createCollection(_c, 'contentchains', () => {
        done();
    });
};
