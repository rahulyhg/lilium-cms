const db = require('./db.js');
const mail = require('./mail.js');
const Admin = require('../backend/admin.js');
const livevars = require('../pipeline/livevars');

class LMLCommunications {
    deepFetch(_c, comm, done) {
        db.findUnique(require('./config').default(), 'entities', {_id : comm.poster}, (err, op) => {
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

    dispatchEmails(_c, comm, article, senderid) {
        let users = article.subscribers || [];
        log('Communications', 'Dispatching emails to ' + users.length + " users");
        for (let i = 0; i < users.length; i++) if (users[i].toString() != senderid.toString()) {
            db.findUnique(require('./config').default(), 'entities', {_id : users[i]}, (err, to) => {
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
                    db.update(
                        cli._c, 'content', {_id : articleid}, 
                        {$addToSet : {subscribers : db.mongoID(cli.userinfo.userid)}}, 
                    function() {
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
                    }, false, true, true);
                } else {
                    cli.sendJSON({error : "Missing rights"});
                }
            }
        });
    };
};

const that = new LMLCommunications();
module.exports = that;
