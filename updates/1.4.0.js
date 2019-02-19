const db = require('../lib/db.js')
const config = require('../lib/config')

module.exports = (_c, done) => {
    db.createCollection(config.default(), 'datareaderreports');
    done();
};


