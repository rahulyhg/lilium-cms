const db = require("../lib/db.js");


module.exports = (conf, done) => {
    log("Update", "Creating Styled Pages collection");
    db.createCollection(conf, 'styledpages', () => {
        done();
    });
}
