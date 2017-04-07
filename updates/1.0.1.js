const db = require("../includes/db.js");
const log = require("../log.js");

module.exports = (conf, done) => {
    log("Update", "Creating Styled Pages collection");
    db.createCollection(conf, 'styledpages', () => {
        done();
    });
}
