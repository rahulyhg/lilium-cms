var _c = require('../lib/config');
var entities = require('../lib/entities.js');
var db = require('./db.js');

var sharedcache = require('./sharedcache.js');
const metrics = require('./metrics');

var UserSesh = function (token) {
    this.data = new Object();
    this.token = token || "";
    this.loggedin;
};

var Sessions = function () {
    var that = this;

    var getFormattedPath = function(cli) {
        var url = cli._c.server.url + "/";
        var indx = url.indexOf('/', 2);
        var domain = url.substring(2, indx);

        var str = "Domain=" + domain;
        return "Path=/";
    };

    this.createToken = function (prefix) {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return (prefix || "") + s4() + s4() + s4() + s4() +
            s4() + s4() + s4() + s4();
    };

    this.createSession = function (tkn) {
        var token = tkn || this.createToken(new Date().getTime());
        var newSesh = new UserSesh(token);
        return newSesh;
    };

    this.logout = function (cli) {
        this.removeSession(cli, function () {
            cli.did('auth', 'logout');
            cli.response.setHeader('Set-Cookie', 'lmlsid'+cli._c.uid+'=""; ' + getFormattedPath(cli));
            cli.redirect(cli._c.server.url + '/login');
        })
    }

    this.setCookieToCli = function (cli) {
        cli.response.setHeader('Set-Cookie', 'lmlsid'+cli._c.uid+'=' + cli.session.token + ';' + getFormattedPath(cli));
    };

    var seshToUserInfo = function(cli) {
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

    this.injectSessionInCli = function (cli, cb) {
        var id = cli.cookies["lmlsid" + cli._c.uid];
        var injected = false;

        sharedcache.getSession(id, function(curSesh) {
            if (this.__TEST) {
                if (cli.request.headers["x-as"]) {
                    return require('../lib/entities').fetchFromDB(cli._c, db.mongoID(cli.request.headers["x-as"]), userObj => {
                        that.createSessionInCli(cli, userObj, () => {
                            seshToUserInfo(cli);

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

                    seshToUserInfo(cli);
                    injected = true;
                }
            } else if (curSesh && cli.routeinfo.configname == curSesh.data.site) {
                cli.session = curSesh;
                seshToUserInfo(cli);

                injected = true;
            }

            if (injected) {
                metrics.plus('authreq');
                cb(true);
            } else {
                db.findUnique(cli._c, "sessions", {token : id}, function(err, sesh) {
                    if (!sesh) {
                        cli.session = new UserSesh();   
                        cb(false);
                    } else {
                        if (sesh.data.site == cli.routeinfo.configname) {
                            cli.session = sesh;
                            seshToUserInfo(cli);
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

    this.reloadSession = function(cli, cb) {
        log('Session', 'Reloading session for token ' + cli.userinfo.userid);
        entities.fetchFromDB(require('../lib/config').default(), db.mongoID(cli.userinfo.userid), function(user) {
            log('Session', 'Removing session from client object');
            that.removeSession(cli, function() {
                log('Session', 'Recreating session');
                that.createSessionInCli(cli, user, cb);
            });
        }, true);
    };

    this.createSessionInCli = function (cli, userObj, cb) {
        cli.session = this.createSession();
        cli.session.loggedin = true;

        for (var k in userObj) {
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
        db.insert(cli._c, 'sessions', cli.session, function () {});

        sharedcache.session(cli.session.token, 'add', cli.session, function() {
            that.setCookieToCli(cli);
            cb && cb();
        });
    };

    this.removeSession = function (cli, callback) {
        log('Session', "Destroying session for token " + cli.session.token);
        // Remove session from db
        db.remove(cli._c, 'sessions', {
            token: cli.session.token
        }, function () {
            // Remove from memory
            sharedcache.session(cli.session.token, 'remove');
            callback();
        });
    }

    this.saveSession = function (cli, callback) {
        cli.session.lastUpdate = new Date();
        delete cli.session._id;
        db.update(cli._c, 'sessions', {
            token: cli.session.token,
        }, cli.session, callback);
    };

    this.getSessionFromSID = function (sid, send) {
        sharedcache.getSession(sid, function(resp) {
            send(resp);
        });
    };

    this.initSessionsFromDatabase = function (conf, cb) {
        var seshCount = 0;
        db.find(conf.id, 'sessions', {}, {}, function (err, data) {
            if (!err) {
                var fetchNext = function () {
                    data.hasNext(function (err, hasNext) {
                        if (hasNext) {
                            seshCount++;
                            data.next(function (err, sesh) {
                                sharedcache.session(sesh.token, 'add', sesh, function() {
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
