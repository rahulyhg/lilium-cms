const log = require('./log.js');
const db = require('./includes/db.js');
const mail = require('./mail.js');
const Admin = require('./backend/admin.js');
const livevars = require('./livevars.js');

class LMLCommunications {
    deepFetch(_c, comm, done) {
        db.findUnique(require('./config.js').default(), 'entities', {_id : comm.poster}, (err, op) => {
            comm.posterobj = op;
            done();
        });
    }

    fetchThread(_c, type, id, send) {
        db.findToArray(_c, 'communications', {objectid : db.mongoID(id), type : type, active : true}, (err, arr) => {
            let index = 0;
            let max = err ? 0 : arr.length;

            let next = () => {
                if (max == index) {
                    send(arr);
                } else {
                    that.deepFetch(_c, arr[index++], next);
                }
            }

            next();
        });
    };

    livevar(cli, levels, params, send) {
        const action = levels[0];
        const type = levels[1];
        const id = levels[2];

        switch (action) {
            case "get":
                that.fetchThread(cli._c, type, id, send);
                break;    

            default:
                send([]);
        }
    };

    dispatchEmails(_c, comm, article, senderid) {
        let users = article.subscribers || [];
        log('Communications', 'Dispatching emails to ' + users.length + " users");
        for (let i = 0; i < users.length; i++) if (users[i].toString() != senderid.toString()) {
            db.findUnique(require('./config.js').default(), 'entities', {_id : users[i]}, (err, to) => {
                require('./mail.js').triggerHook(_c, 'communication_on_article', to.email, {
                    to : to,
                    communication : comm,
                    article : article
                });
            });
        }
    }

    insertArticleComm(_c, comm, done) {
        db.insert(_c, 'communications', comm, done);
    };

    handlePostArticle(cli, articleid) {
        db.findUnique(cli._c, 'content', {_id : articleid}, (err, article) => {
            if (err || !article) {
                cli.sendJSON({error : "Content not found", message : err});
            } else {
                if (cli.hasRight('editor') || article.author.toString() == cli.userinfo.userid.toString()) {
                    let comm = {
                        type : "article",
                        objectid : articleid,
                        poster : db.mongoID(cli.userinfo.userid),
                        content : cli.postdata.data.content,
                        date : new Date(),
                        active : true
                    };

                    that.insertArticleComm(cli._c, comm, () => {
                        that.deepFetch(cli._c, comm, () => {
                            that.dispatchEmails(cli._c, comm, article, cli.userinfo.userid);
                            cli.sendJSON({success : true});
                        });
                    });
                } else {
                    cli.sendJSON({error : "Missing rights"});
                }
            }
        });
    };

    adminPOST(cli) {
        if (cli.routeinfo.path < 4) {
            return cli.sendJSON({error : "Wrong route."});
        }

        let pComm = cli.postdata.data;
        let type = cli.routeinfo.path[2];
        let objectid = db.mongoID(cli.routeinfo.path[3]);

        switch (type) {
            case "article": that.handlePostArticle(cli, objectid); break;
            default : cli.sendJSON({error : "Invalid type"});
        }
    };

};

const that = new LMLCommunications();
module.exports = that;
