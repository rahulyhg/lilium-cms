var log = require('./log.js');
var livevars = require('./livevars.js');
var postleaf = require('./postleaf.js');
var admin = require('./backend/admin.js');
var db = require('./includes/db.js');

var Quiz = function() {
    this.adminPOST = function(cli) {
        var newvalues = JSON.parse(cli.postdata.data.quizjson);
        var conds = {_id : db.mongoID(cli.postdata.data.contentid)};

        if (!cli.hasRight("editor")) {
            conds.author = db.mongoID(cli.userinfo.userid);
        }

        db.update(cli._c, 'content', conds, {featuredata : newvalues}, function(err, res) {
            cli.sendJSON(res);
        });
    };
};

module.exports = new Quiz();
