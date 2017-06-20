const db = require('../includes/db.js');
const config = require('../config.js');

module.exports = (_c, done) => {
    db.createCollection(_c, 'socialaccounts', () => {
        db.createCollection(_c, 'socialdispatch', done);
    });
};
