const Topics = require('../topics.js');
const log = require('../log.js');

module.exports = (conf, done) => {
    log('Lilium', "Updating to version 1.0.2");
    Topics.portCategories(conf, () => {
        log("Lilium", "Ported categories");
        done();
    });
};
