const _c = require('../lib/config');
const entities = require('../lib/entities.js');
const db = require('./db.js');

const sharedcache = require('./sharedcache.js');
const metrics = require('./metrics');

class UserSesh {
    constructor(token = "") {
        this.data = {};
        this.token = token;
        this.loggedin;
    }
};

class Sessions {
    getFormattedPath(cli) {
        let url = cli._c.server.url + "/";
        let indx = url.indexOf('/', 2);
        let domain = url.substring(2, indx);

        let str = "Domain=" + domain;
        return "Path=/";
    };

    createToken(prefix) {
        const s4 = () => {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return (prefix || "") + s4() + s4() + s4() + s4() +
            s4() + s4() + s4() + s4();
    };

    createSession(tkn) {
        let token = tkn || this.createToken(new Date().getTime());
        let newSesh = new UserSesh(token);
        return newSesh;
    };

    logout(cli) {
        this.removeSession(cli, () => {
            cli.did('auth', 'logout');
            cli.response.setHeader('Set-Cookie', 'lmlsid'+cli._c.uid+'=""; ' + this.getFormattedPath(cli));
            cli.redirect(cli._c.server.url + '/login');
        })
    }

    setCookieToCli(cli) {
        cli.response.setHeader('Set-Cookie', 'lmlsid'+cli._c.uid+'=' + cli.session.token + ';' + this.getFormattedPath(cli));
    };

    seshToUserInfo(cli) {
        cli.userinfo = {
            loggedin: cli.session.loggedin,
            roles: cli.session.data.roles,
            rights : cli.session.data.rights,
            userid: db.mongoID(cli.session.data._id),
            logintime: cli.session.data.logintime,
            displayname: cli.session.data.displayname,
            admin: cli.session.data.admin,
            god: cli.session.data.god,
            user: cli.session.data.user,
            username : cli.session.data.user,
            site: cli.routeinfo.configname
        };
    }

    injectSessionInCli(cli, cb) {
        let id = cli.cookies["lmlsid" + cli._c.uid];
        let injected = false;

        sharedcache.getSession(id, (curSesh) => {
            if (this.__TEST) {
                if (cli.request.headers["x-as"]) {
                    return require('../lib/entities').fetchFromDB(cli._c, db.mongoID(cli.request.headers["x-as"]), userObj => {
                        this.createSessionInCli(cli, userObj, () => {
                            this.seshToUserInfo(cli);

                            cb(true);
                        });
                    });
                } else {
                    cli.session = {
                        loggedin : true, 
                        data : {
                            roles : [cli.request.headers["x-right"]], rights : [cli.request.headers["x-right"]],
                            _id : db.mongoID(cli.request.headers["x-as"]), logintime : Date.now(),
                            displayname : "Lilium Test user", admin : cli.request.headers["x-right"] == "admin",
                            god : cli.request.headers["x-right"] == "lilium", user : db.mongoID(cli.request.headers["x-as"]),
                            username : "lilium-test-user",
                        }
                    };

                    this.seshToUserInfo(cli);
                    injected = true;
                }
            } else if (curSesh && cli.routeinfo.configname == curSesh.data.site) {
                cli.session = curSesh;
                this.seshToUserInfo(cli);

                injected = true;
            }

            if (injected) {
                metrics.plus('authreq');
                cb(true);
            } else {
                db.findUnique(cli._c, "sessions", {token : id}, (err, sesh) => {
                    if (!sesh) {
                        cli.session = new UserSesh();   
                        cb(false);
                    } else {
                        if (sesh.data.site == cli.routeinfo.configname) {
                            cli.session = sesh;
                            this.seshToUserInfo(cli);
                            sharedcache.session(id, 'add', sesh);

                            metrics.plus('authreq');
                            cb(true);
                        } else {
                            cb(false);
                        }
                    }
                });
            }
        });
    };

    reloadSession(cli, cb) {
        log('Session', 'Reloading session for token ' + cli.userinfo.userid);
        entities.fetchFromDB(require('../lib/config').default(), db.mongoID(cli.userinfo.userid), (user) => {
            log('Session', 'Removing session from client object');
            this.removeSession(cli, () => {
                log('Session', 'Recreating session');
                this.createSessionInCli(cli, user, cb);
            });
        }, true);
    };

    createSessionInCli(cli, userObj, cb) {
        cli.session = this.createSession();
        cli.session.loggedin = true;

        for (let k in userObj) {
            cli.session.data[k] = userObj[k];
        }

        cli.session.data.admin = entities.isAllowed(userObj, 'admin');
        cli.session.data.god = entities.isAllowed(userObj, 'lilium');
        cli.session.data.user = userObj.username;
        cli.session.data.site = cli.routeinfo.configname;

        cli.userinfo = cli.session.data;

        cli.session.data.preferences = userObj.preferences || {};
        cli.session.lastupdate = new Date();

        // No need for callback
        db.insert(cli._c, 'sessions', cli.session, () => {});

        sharedcache.session(cli.session.token, 'add', cli.session, () => {
            this.setCookieToCli(cli);
            cb && cb();
        });
    };

    removeSession(cli, callback) {
        log('Session', "Destroying session for token " + cli.session.token);
        // Remove session from db
        db.remove(cli._c, 'sessions', {
            token: cli.session.token
        }, () => {
            // Remove from memory
            sharedcache.session(cli.session.token, 'remove');
            callback();
        });
    }

    saveSession(cli, callback) {
        cli.session.lastUpdate = new Date();
        delete cli.session._id;
        db.update(cli._c, 'sessions', {
            token: cli.session.token,
        }, cli.session, callback);
    };

    getSessionFromSID(sid, send) {
        sharedcache.getSession(sid, (resp) => {
            send(resp);
        });
    };

    initSessionsFromDatabase(conf, cb) {
        let seshCount = 0;
        db.find(conf.id, 'sessions', {}, {}, (err, data) => {
            if (!err) {
                let fetchNext = () => {
                    data.hasNext((err, hasNext) => {
                        if (hasNext) {
                            seshCount++;
                            data.next((err, sesh) => {
                                sharedcache.session(sesh.token, 'add', sesh, () => {
                                    fetchNext();
                                });
                            });
                        } else {
                            log("Session", "Loaded " + seshCount + " sessions from databse");
                            cb();
                        }
                    });
                }
                fetchNext();
            } else {
                cb();
            }
        });
    };
};

module.exports = new Sessions();
