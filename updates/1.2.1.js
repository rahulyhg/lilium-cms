const log = require('../log.js');
const db = require('../includes/db.js');
const config = require('../config.js');

module.exports = (_c, done) => {
    db.createCollections(config.default(), ["badges", "decorations"], done);
};
