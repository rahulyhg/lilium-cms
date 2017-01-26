var diff = require('diff');
var log = require('./log.js');
var db = require('./includes/db.js');
var Admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');

class History {
    pushModification(cli, id, oldArticle, cb) {
        delete oldArticle._id;
        oldArticle.contentid = id;
        oldArticle.historyPushed = new Date();
        oldArticle.modifiedBy = cli.userinfo.userid;
        oldArticle.historytype = "modification";

        db.insert(cli._c, 'history', oldArticle, cb);
    };

    pushStatus(cli, id, type, cb) {

    };

    restore(_c, id, cb) {
        
    };

    GET(cli) {
        filelogic.serveAdminLML(cli, true);
    };

    POST(cli) {

    };

    fetchHistoryOne(cli, contentid, send) {
        db.findUnique(cli._c, 'content', {_id : db.mongoID(contentid)}, [], function(err, article) {
            let author = article.author;
            if (cli.hasRight('editor') || author == cli.userinfo.userid) {
                db.findToArray(cli._c, 'history', {contentid : db.mongoID(contentid)}, function(err, arr) {
                    send({
                        currentstate : article,
                        modifications : arr
                    });
                });
            } else {
                send(new Error("Missing right to edit, or article is not owned by current user."));
            }
        });
    };

    livevar(cli, levels, params, callback) {
        if (levels[0] == "article") {
            let contentid = levels[1];

            if (cli.hasRight('publish')) {
                this.fetchHistoryOne(cli, contentid, callback);
            } else {
                callback({err : new Error("Missing publication rights.")});
            }
        }
    };

    registerLiveVar() {
        let that = this;
        require('./livevars.js').registerLiveVariable('history', (cli, levels, params, callback) => {
            that.livevar(cli, levels, params, callback);
        });
    };

    registerEndpoints() {
        Admin.registerAdminEndpoint('history', 'GET', this.GET);
        Admin.registerAdminEndpoint('history', 'POST', this.POST);
    };
};

module.exports = new History();
