const log = require('../log.js');
const db = require('../includes/db.js');
const config = require('../config.js');
const badges = require('../badges.js');

const DECO_COLLECTION = "decorations";
const BADGES_COLLECTION = "badges";

module.exports = (_c, done) => {
    db.createCollections(config.default(), [DECO_COLLECTION, BADGES_COLLECTION], () => {
        db.createIndex(config.default(), BADGES_COLLECTION, {slug : 1}, () => {
            badges.createDefaultBadges(done);
        });
    });
};
