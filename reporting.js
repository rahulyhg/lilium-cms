const log = require('./log.js');
const db = require('./includes/db.js');
const CryptoJS = require('crypto-js');

const POKE_TIMEOUT = 4 * 1000;    // 4 seconds
const ACTIVE_TIMEOUT = 5 * 1000;  // 5 seconds

class UserClient {
    constructor(ip, useragent) {
        this.ip = ip;
        this.useragent = useragent;
        this.firstvisit = new Date();
        this.extra = {};

        this.userid = this.createCookie(ip, useragent);
    }

    createCookie(ip, useragent) {
        return CryptoJS.SHA256(ip + useragent + new Date()).toString(CryptoJS.enc.Hex)
    }

    insert(conf, done) {
        db.insert(conf, 'userclients', {
            ip : this.ip,
            useragent : this.useragent,
            firstvisir : this.firstvisit, 
            userid : this.userid,
            extra : this.extra
        }, done);
    }
}

class UserSession {
    constructor(userid) {
        this.userid = userid;
        this.createdAt = new Date();

        this.sessionid = this.createSessionID();
    }

    createSessionID() {
        return CryptoJS.SHA256(this.userid + new Date()).toString(CryptoJS.enc.Hex)
    }

    insert(conf, done) {
        db.insert(conf, 'usersessions', {
            userid : this.userid,
            createdAt : new Date(),
            sessionid : this.sessionid
        }, done);
    }
}

class PageView {
    constructor(url, sessionid, extra) {
        this.url = url;
        this.at = new Date();
        this.sessionid = sessionid;

        this.extra = extra || {};
    }
}

class UserEvent {
    constructor(type, data, sessionid) {
        this.type = type;
        this.data = data;
        this.sessionid = sessionid;
    }
}

class ReportedSite {
    constructor(siteconf) {
        this.config = siteconf;

        this.active = 0;
        this.pages = {};
        this.articles = {};
    }

    poke(url, articleid) {
        this.active++;
        this.pages[url] = this.pages[url] ? this.pages[url] + 1 : 1;
        
        if (articleid) {
            this.articles[articleid] = this.articles[articleid] ? this.articles[articleid] + 1 : 1;
        }
        setTimeout(this.leave.bind(this, url, articleid), ACTIVE_TIMEOUT);
    }

    leave(url, articleid) {
        this.active--;
        url && this.pages[url]--;
        articleid && this.articles[articleid]--;
    }
}

class Reporting {
    constructor() {
        this.cache = {
            userclients : {},
            usersessions : {},
            ping : {}
        };

        this.sites = {};
    }

    setup() {
        let that = this;
        require("./config.js").eachSync((site) => {
            that.sites[site.id] = new ReportedSite(site);
        });
    }

    livevar(cli, levels, params, send) {
        send({
            active   : this.sites[cli._c.id].active,
            pages    : this.sites[cli._c.id].pages,
            articles : this.sites[cli._c.id].articles
        });
    }

    registerEvent(conf, user, session, type, data, done, requestdata) {
        if (type == "pageview") {
            let pageview = new PageView(data.url, session.sessionid, {
                articleid : data.articleid ? db.mongoID(data.articleid) : "ros"
            });
            requestdata.cli.extra.type = "view";
            db.insert(conf, 'pageviews', pageview, done);
        } else {
            let userevent = new UserEvent(type, data, session.sessionid);
            requestdata.cli.extra.type = "event";
            requestdata.cli.extra.event = type;
            db.insert(conf, 'userevents', userevent, done);
        }
    }

    getUserClient(conf, userid, sendback, requestdata) {
        let that = this;
        if (userid) {
            if (this.cache.userclients[userid]) {
                sendback(this.cache.userclients[userid]);
            } else {
                db.findUnique(conf, 'userclients', {userid : userid}, (err, client) => {
                    if (err || !client) {
                        that.getUserClient(conf, undefined, sendback, requestdata);
                    } else {
                        that.cache.userclients[userid] = client;
                        sendback(client);
                    }
                });
            }
        } else {
            let ip = requestdata.ip;
            let useragent = requestdata.useragent;
            let url = requestdata.url;
            let cli = requestdata.cli;

            let client = new UserClient(userid, ip, useragent);
            cli.response.setHeader("Set-Cookie", "lmlcli=" + client.userid + "; Max-Age=" + (60*60*24*365*5));
            cli.response.setHeader("Client-Identifier", client.userid);

            client.extra.firstUrl = url;

            client.insert(conf, () => {
                that.cache.userclients[userid] = client;
                sendback(client);
            });
        }
    }

    getUserSession(conf, userclient, sessionid, sendback, requestdata) {
        let that = this;
        if (sessionid) {
            if (this.cache.usersessions[sessionid]) {
                sendback(this.cache.usersessions[sessionid]);
            } else {
                db.findUnique(conf, 'usersessions', {sessionid : sessionid}, (err, session) => {
                    if (err || !session) {
                        that.getUserSession(conf, userclient, undefined, sendback, requestdata);
                    } else {
                        that.cache.usersessions[sessionid] = session;
                        sendback(session);
                    }
                });
            }
        } else {
            let clientid = userclient.userid;
            let session = new UserSession(clientid);

            requestdata.cli.response.setHeader("Set-Cookie", "lmlusersesh=" + session.sessionid + "; Max-Age=" + (60*60*5));
            session.insert(conf, () => {
                that.cache.usersessions[session.sessionid] = session;
                requestdata.cli.extra.sessionid = session.sessionid;
                sendback(session);
            });
        }
    }

    GET(cli) {
        let that = this;
        let userid = cli.cookies.lmlcli;
        let sessionid = cli.routeinfo.params.sessionid || cli.cookies.lmlusersesh;

        if (this.cache.ping[userid] && new Date() - this.cache.ping[userid].time < POKE_TIMEOUT) {
            return cli.sendJSON({message : ":/"});
        } 

        this.cache.ping[userid] = {
            time : new Date()
        }

        this.sites[cli._c.id].poke(cli.request.headers.referer, cli.routeinfo.params.articleid);
        if (cli.routeinfo.path[1]) {
            that.getUserClient(cli._c, userid, (userclient) => {
                that.getUserSession(cli._c, userclient, sessionid, (usersession) => {
                    that.registerEvent(cli._c, userclient, usersession, cli.routeinfo.path[1], {
                        url : cli.request.headers.referer,
                        articleid : cli.routeinfo.params.articleid
                    }, () => {
                        cli.extra.message = ":)";
                        cli.sendJSON(cli.extra);
                    }, {
                        cli : cli
                    });
                }, {
                    cli : cli
                });
            }, {
                ip : cli.request.connection.remoteAddress,
                useragent : cli.request.headers["User-Agent"],
                url : cli.request.headers.referer,
                cli : cli
            });
        } else {
            cli.response.end(":D");
        }
    }
}

module.exports = new Reporting();
