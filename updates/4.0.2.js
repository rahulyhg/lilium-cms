const db = require('../lib/db');
const { forEachAsync } = require('../lib/loops');

module.exports = (_c, done) => {
    db.findToArray(_c, 'themes', {}, (err, arr) => {
        forEachAsync(arr, (t, next) => {
            const settings = t.settings || {};

            if (settings.en && settings.fr) {
                return next();
            }

            db.update(_c, 'themes', { _id : t._id }, {
                ["settings.en"] : settings,
                ["settings.fr"] : settings
            }, () => {
                next();
            });
        }, () => {
            done();
        });
    });
};
