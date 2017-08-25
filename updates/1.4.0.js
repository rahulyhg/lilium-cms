const db = require('../includes/db.js')
const config = require('../config')

module.exports = (_c, done) => {
    db.createCollection(config.default(), 'datareaderreports');
    done();
};


