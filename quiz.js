const log = require('./log.js');
const livevars = require('./livevars.js');
const postleaf = require('./postleaf.js');
const admin = require('./backend/admin.js');
const db = require('./includes/db.js');

class Quiz {
    adminPOST(cli) {
        const newvalues = JSON.parse(cli.postdata.data.quizjson);
        const conds = {_id : db.mongoID(cli.postdata.data.contentid)};

        if (!cli.hasRight("editor")) {
            conds.author = db.mongoID(cli.userinfo.userid);
        }

        db.update(cli._c, 'content', conds, {featuredata : newvalues}, (err, res) => {
            cli.sendJSON(res);
        });
    }
};

module.exports = new Quiz();
