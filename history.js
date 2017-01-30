var diff = require('deep-diff').diff;
var log = require('./log.js');
var db = require('./includes/db.js');
var Admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');
var utils = require('./utils.js');

class History {
    constructor() {
        this.ignoredFields = ["modified", "_id", "updated", "status", "tagslugs"];
    };

    pushModification(cli, oldState, _id, cb) {
        log('History', 'Fetching older state of article with mongo id : ' + _id, 'info');
        let history = this;

        db.findUnique(cli._c, 'content', {_id : _id}, (err, newArticle) => {
            let diffs = diff(oldState, newArticle);
            let lmldiffs = [];
            let newStatus = false;

            diffs.forEach((diff) => {
                if (history.ignoredFields.indexOf(diff.path[0]) == -1) {
                    let diffobj = {};
                    switch (diff.kind) {
                        case "N": diffobj.change = "added";     break;
                        case "D": diffobj.change = "removed";   break;
                        case "E": diffobj.change = "modified";  break;
                        case "A": diffobj.change = "array";     break;
                        default : diffobj.change = "unknown";   
                    }

                    if (diffobj.change == "modified" && !utils.pulloutProp(oldState, diff.path)) {
                        diffobj.change = "added";
                    } else if (diffobj.change == "modified" && !utils.pulloutProp(newArticle, diff.path)) {
                        diffobj.change = "removed";
                    }

                    diffobj.field = diff.path;
                    lmldiffs.push(diffobj);
                }
            });

            if (newArticle.status != oldState.status) {
                newStatus = newArticle.status;
            }

            if (lmldiffs.length != 0 || newStatus) {
                log('History', 'Pushing old state into history', 'info');
                db.insert(cli._c, 'history', {
                    state : oldState,
                    diffs : lmldiffs,
                    statusChange : newStatus,
                    modifiedBy : cli.userinfo.userid,
                    historytype : "mod",
                    modifiedOn : new Date(),
                    contentid : _id
                }, cb);
            } else {
                log('History', 'No diff detected; not pushing into history', 'info');
                cb();
            }
        });
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
        db.findUnique(cli._c, 'content', {_id : db.mongoID(contentid)}, function(err, article) {
            let author = article.author;
            if (cli.hasRight('editor') || author == cli.userinfo.userid) {
                db.findToArray(cli._c, 'history', {contentid : db.mongoID(contentid)}, function(err, arr) {
                    send({
                        currentstate : article,
                        modifications : arr
                    });
                }, {state : 0});
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
