const db = require('./includes/db.js');
const log = require('./log.js');
const formBuilder = require('./formBuilder.js');
const config = require('./config.js');
const filelogic = require('./filelogic.js');
const request = require('request');
const articleLib = require('./article.js');

const CAIJ = require('./caij/caij.js');

const DISPATCH_COLLECTION = "socialdispatch";   // Website collection
const ACCOUNTS_COLLECTION = "socialaccounts";   // Network collection

const GRAPH_API = "https://graph.facebook.com/v";
const FEED_ENDPOINT = "/feed/";
const GRAPH_TOKEN = "?access_token=";

const scheduledTasks = {};

class SocialPost {
    constructor(message, siteid, postid, pageid, time, status, _id) {
        this.message = message;
        this.siteid = siteid;
        this.postid = db.mongoID(postid);
        this.pageid = db.mongoID(pageid);
        this.status = status || "draft";
        this.time = time ? new Date(time).getTime() : Date.now();
        this._id = _id;
    }

    publish(done) {
        scheduledTasks[this.siteid + "_" + this._id] = undefined;

        db.findUnique(config.default(), ACCOUNTS_COLLECTION, {_id : this.pageid}, (err, account) => {
            if (!account || err) {
                log("SDispatch", "Social account not found or database error : " + err, 'warn');
                return done && done(err || true);
            }

            let _c = config.fetchConfig(this.siteid);

            if (account.network == "facebook") {
                articleLib.deepFetch(_c, this.postid, (article) => {
                    log("SDispatch", "Sending POST request to Facebook Graph /feed on page " + account.displayname);
                    let reqURL = GRAPH_API + _c.social.facebook.apiversion + FEED_ENDPOINT + GRAPH_TOKEN + account.accesstoken;

                    // Debug
                    if (article.url.includes("localhost")) {
                        article.url = undefined;
                    }

                    request({
                        method : "POST",
                        url : reqURL,
                        json : {
                            message : this.message, 
                            link : article.url,
                            published : true,
                        }
                    }, (err, msg, body) => {
                        log("SDispatch", "Got response from Facebook Graph");
                        if (body && body.id) {
                            this.success = true;
                            this.ref = body.id;
                            this.status = "published";
                            this.time = Date.now();

                            require('./notifications.js').notifyUser(article.author, this.siteid, {
                                type : "log",
                                title : "Facebook Graph",
                                msg : "Your article " + 
                                    article.title + " was shared on the " + 
                                    account.displayname + " Facebook page." 
                            });

                            log("SDispatch", "Got response from Facebook Graph with success flag : " + !!this.success);
                            db.update(_c, 'content', {_id : this.postid}, { $addToSet : {facebookpostids : body.id} }, () => {
                                log("SDispatch", "Pushed new Facebookm post ID to content collection under 'facebookpostids'");
                                db.update(_c, DISPATCH_COLLECTION, {_id : this._id}, {status : "published", ref : body.id}, ()=>{
                                    log("SDispatch", "Updated schedule from database with the published status");
                                    done && done(undefined, "Successfully posted on Facebook");
                                });
                            }, false, true, true);
                        } else {
                            log("SDispatch", "But something went wrong : " + (err || body.error.message), "warn");
                            done && done(err || body.error.message);
                        }
                    });
                });
            } else {
                done && done("Invalid Facebook account");
            }
        });
    }

    insert(done) {
        db.insert(this.siteid, DISPATCH_COLLECTION, this, done || function() {});
    }

    update(done) {
        db.update(this.siteid, DISPATCH_COLLECTION, {_id : this._id}, this, done || function() {});
    }

    cancel() {
        clearTimeout(scheduledTasks[this.siteid + "_" + this._id]);
        scheduledTasks[this.siteid + "_" + this._id] = undefined;
    }

    commit() {
        if (!scheduledTasks[this.siteid + "_" + this._id]) {
            return scheduledTasks[this.siteid + "_" + this._id] = setTimeout(()=>{this.publish();}, this.time - Date.now());
        } else {
            this.cancel();
            
            return this.commit();
        }
    }

    static getSingle(_c, _id, sendback) {
        db.findSingle(_c, DISPATCH_COLLECTION, {_id}, (err, x) => {
            sendback(SocialPost.buildFromDB(x));
        });
    }

    static deepFetch(_c, _id, sendback) {
        SocialPost.getSingle(_c, _id, (post) => {
            require('./article.js').deepFetch(_c, post.postid, (article) => {
                post.article = article;
                sendback(post);
            });
        });
    }

    static buildFromDB(x) {
        return new SocialPost( x.message, x.siteid, x.postid, x.pageid, x.time, x.status, x._id );
    }

    static fetchScheduled(_c, send) {
        db.findToArray(_c, DISPATCH_COLLECTION, {status : "scheduled"}, (err, arr) => {
            send(arr.map( x => SocialPost.buildFromDB(x) ));
        });
    }

    static commitScheduled(_c, done) {
        SocialPost.fetchScheduled(_c, (posts) => {
            log('SDispatch', "Found " + posts.length + " posts to commit on " + _c.website.sitetitle);
            posts.forEach(x => x.commit());
            done && done();
        });
    }
}

class SocialDispatch {
    init() {
        log('SDispatch', "Fetching scheduled post and adding to timeline");
        config.eachSync((_c) => {
            SocialPost.commitScheduled(_c);
        });
    }

    getSingle(_c, _id, sendback) {
        SocialPost.getSingle(_c, _id, sendback);
    }

    schedule(_c, postid, pageid, message, time, cb) {
        log('SDispatch', "Received schedule request on site " + _c.id + " for post " + postid);
        let sPost = new SocialPost(message, _c.id, postid, pageid, time, "scheduled");
        sPost.insert(() => {
            if (time == "now" || Date.now() > time) {
                log('SDispatch', "Publishing " + postid + " now since dispatch time is less than current time");
                sPost.publish(cb);
            } else {
                log('SDispatch', "Dispatch commit of post " + postid);
                // Send task to CAIJ
                CAIJ.scheduleTask('socialDispatch', {
                    siteid : _c.id,
                    direct : true,
                    action : "commit",
                    _id : sPost._id
                });
                cb && cb(undefined, "Post was scheduled to be published on Facebook successfully");
            }
        });
    }

    getDatasource(_c, params, send) {
        let startdate = parseInt(params.startstamp);
        let enddate = parseInt(params.endstamp);

        db.join(_c, DISPATCH_COLLECTION, [
            { 
                $match : {
                    $and : [ 
                        { time : { $lt : enddate   }}, 
                        { time : { $gt : startdate }},
                        { status : { $ne : "deleted" } }
                    ]
                }
            }, {
                $lookup : {
                    from : "content",
                    localField : "postid",
                    foreignField : "_id",
                    as : "article"
                }
            }, {
                $unwind : "$article"
            }, {
                $project : {
                    time : 1,
                    status : 1,
                    "article.title" : 1
                }
            } 
        ], (arr) => {
            let resp = {};
            arr.forEach(post => {
                let d = new Date(post.time);
                let y = d.getFullYear();
                let m = d.getMonth();
                let t = d.getDate();
                resp[y] = resp[y] || {};
                resp[y][m] = resp[y][m] || {};
                resp[y][m][t] = resp[y][m][t] || [];

                resp[y][m][t].push({
                    id : post._id,
                    at : post.time,
                    displayname : post.article && post.article.title,
                    color : post.status == "published" ? "#bbb" : "#af57e4"
                })
            });

            send(resp);
        });
    }

    adminGET(cli) {
        switch (cli.routeinfo.path[2]) {
            case undefined:
            case "networks":
                filelogic.serveAdminLML3(cli);
                break;

            case "deepFetch":
                SocialPost.deepFetch(cli._c, db.mongoID(cli.routeinfo.path[3]), (item) => {
                    cli.sendJSON(item);
                });
                break;

            case "datasource":
                this.getDatasource(cli._c, cli.routeinfo.params, (events) => {
                    cli.sendJSON(events);
                });
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
                        msg : "Network has now " + cli.postdata.data.accounts.length + " social accounts.",
                        title : "Saved"
                    });
                });
            });
        } else if (level == "remove") {
            let _id = db.mongoID(cli.postdata.data.id);
            db.update(cli._c, DISPATCH_COLLECTION, {_id}, {
                status : "deleted"
            }, () => {
                CAIJ.scheduleTask('socialDispatch', {
                    siteid : cli._c.id,
                    direct : true,
                    action : "remove",
                    _id 
                });
                cli.sendJSON({});
            });
        } else if (level == "move") {
            let _id = db.mongoID(cli.postdata.data._id);
            let date = cli.postdata.data.date;

            db.update(cli._c, DISPATCH_COLLECTION, {_id}, {
                time : parseInt(date)
            }, () => {
                CAIJ.scheduleTask('socialDispatch', {
                    siteid : cli._c.id,
                    direct : true,
                    action : "commit",
                    _id 
                });
                cli.sendJSON({});
            });
        } else if (level == "schedule") {
            const notif = require('./notifications.js');
            let data = cli.postdata.data;
            let time = data.time;
            if (!isNaN(time)) {
                time = parseInt(time);
            } else {
                time = "now";
            }


            this.schedule(cli._c, data.postid, data.pageid, data.message, time, (err, info) => {
                cli.sendJSON({
                    success : true
                });

                if (err) {
                    notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        type : "danger",
                        title : "Facebook Graph",
                        msg : err
                    });
                } else {
                    notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        type : "success",
                        title : "Facebook Graph",
                        msg : info || "Post was sheduled"
                    });
                }
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
