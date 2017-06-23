const db = require('./includes/db.js');
const formBuilder = require('./formBuilder.js');
const config = require('./config.js');
const filelogic = require('./filelogic.js');
const request = require('request');
const articleLib = require('./article.js');

const DISPATCH_COLLECTION = "socialdispatch";   // Website collection
const ACCOUNTS_COLLECTION = "socialaccounts";   // Network collection

const GRAPH_API = "https://graph.facebook.com/";
const FEED_ENDPOINT = "/feed/";
const GRAPH_TOKEN = "?access_token=";

class SocialPost {
    constructor(message, siteid, postid, pageid, time) {
        this.message = message;
        this.siteid = siteid;
        this.postid = db.mongoID(postid);
        this.pageid = db.mongoID(pageid);
        this.time = time ? new Date(time).getTime() : Date.now();
    }

    publish(done) {
        db.findUnique(config.default(), ACCOUNTS_COLLECTION, {_id : this.pageid}, (err, account) => {
            if (!account || err) {
                return done(err || true);
            }

            let _c = config.fetchConfig(this.siteid);

            if (account.network == "facebook") {
                articleLib.deepFetch(_c, this.postid, (article) => {
                    request({
                        method : "POST",
                        url : GRAPH_API + _c.social.facebook.apiversion + FEED_ENDPOINT + GRAPH_TOKEN + account.token,
                        json : {
                            message : this.message, 
                            link : article.url,
                            published : true,
                        }
                    }, (err, msg, body) => {
                        if (body && body.id) {
                            this.success = true;
                            this.ref = body.id;
                            this.status = "published";
                            this.time = Date.now();

                            db.update(_c, 'content', {_id : this.postid}, { $addToSet : {facebookpostids : body.id} }, () => {
                                db.update(_c, DISPATCH_COLLECTION, {_id : this.pagemongoid, ref : body.id}, {status : "published"}, ()=>{
                                    done && done(undefined, this);
                                });
                            });
                        }
                    });
                });
            } else {
                done && done();
            }
        });
    }

    insert(done) {
        db.insert(this.siteid, DISPATCH_COLLECTION, this, done || function() {});
    }

    commit() {
        setTimeout(this.publish, this.time - Date.now());
    }

    static buildFromDB(x) {
        return new SocialPost( x.message, x.siteid, x.postid, x.pageid, x.time );
    }

    static fetchScheduled(_c, send) {
        db.findToArray(_c, DISPATCH_COLLECTION, {status : "scheduled"}, (err, arr) => {
            send(arr.map( x => SocialPost.buildFromDB(x) ));
        });
    }

    static commitScheduled(_c, done) {
        SocialPost.fetchScheduled(_c, (posts) => {
            posts.forEach(x => x.commit());
            done();
        });
    }
}

class SocialDispatch {
    schedule(_c, postid, pageid, message, time) {
        let sPost = new SocialPost(message, _c.id, postid, pageid, time);
        if (time == "now" || Date.now() < time) {
            sPost.publish();
        } else {
            sPost.insert(() => {
                sPost.commit();
            });
        }
    }

    adminGET(cli) {
        switch (cli.routeinfo.path[2]) {
            case undefined:
            case "networks":
                filelogic.serveAdminLML3(cli);
                break;

            default:
                cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {
        let level = cli.routeinfo.path[2];

        if (level == "networks") {
            let accounts = cli.postdata.data.accounts || [];
            db.remove(config.default(), ACCOUNTS_COLLECTION, {}, () => {
                db.insert(config.default(), ACCOUNTS_COLLECTION, accounts, () => { 
                    cli.sendJSON({
                        success : true,
                        message : "Network has now " + cli.postdata.data.accounts.length + " social accounts.",
                        title : "Saved"
                    });
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    livevar(cli, levels, params, send) {
        let level = levels[0];

        if (level == "networks") {
            if (levels[1] == "simple") {
                db.findToArray(config.default(), ACCOUNTS_COLLECTION, {}, (err, array) => {
                    send(err || {accounts : array});
                }, { _id : 1, displayname : 1, network : 1 });
            } else if (levels[1] == "liveselect") {
                db.findToArray(config.default(), ACCOUNTS_COLLECTION, {}, (err, array) => {
                    send(
                        array.map(
                            (x) => { 
                                return {
                                    displayname : x.displayname, 
                                    name : x._id
                                }; 
                            }
                        )
                    );
                }, { _id : 1, displayname : 1, network : 1 });
            } else if (levels[1] == "full") {
                if (cli.hasRight('admin')) {
                    db.findToArray(config.default(), ACCOUNTS_COLLECTION, {}, (err, array) => {
                        send(err || {accounts : array});
                    });
                } else {
                    send([]);
                }
            } else {
                send([]);
            }
        } else {
            send([]);
        }
    }

    form() {
        formBuilder.createForm('networksocialaccounts', {
            fieldWrapper: {
                tag: 'div',
                cssPrefix: 'settingsfield-'
            },
            cssClass: 'social-accounts-form'
        })
        .add('title', 'title', {
            displayname : "Network Social accounts"
        })
        .add('accounts', 'stack', {
            displayname : "Accounts",
            scheme : {
                columns : [
                    {
                        fieldName   : "displayname",
                        dataType    : "text",
                        displayname : "Display Name"
                    }, {
                        fieldName   : "network",
                        dataType    : "text",
                        displayname : "Network"
                    }, {
                        fieldName   : "accountid",
                        dataType    : "text",
                        displayname : "Account ID"
                    }, {
                        fieldName   : "accesstoken",
                        dataType    : "text",
                        displayname : "Access Token"
                    }
                ]
            }
        })
        .add('save', 'button', {
            displayname : "Save",
            classes : ["network-accounts-save"]
        });
    }

    setup() {
        db.createCollection(config.default(), ACCOUNTS_COLLECTION, () => {});
    }
}

module.exports = new SocialDispatch();
