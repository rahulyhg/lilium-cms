var _c = require('./config.js');
var entities = require('./entities.js');
var db = require('./includes/db.js');
var log = require('./log.js');

var _sesh = new Object();


var UserSesh = function (token) {
    this.data = new Object();
    this.token = token || "";
    this.loggedin;
};

var Sessions = function () {
    this.createToken = function (prefix) {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return (prefix || "") + s4() + s4() + s4() + s4() +
            s4() + s4() + s4() + s4();
    };

    this.createSession = function () {
        var token = this.createToken(new Date().getTime());
        var newSesh = new UserSesh(token);
        return newSesh;
    };

    this.logout = function (cli) {
        this.removeSession(cli, function () {
            cli.response.setHeader('Set-Cookie', 'lmlsid=""');
            cli.redirect(cli._c.server.url + '/admin');
        })
    }

    this.setCookieToCli = function (cli) {
        cli.response.setHeader('Set-Cookie', 'lmlsid=' + cli.session.token);
    };

    var seshToUserInfo = function(cli) {
        cli.userinfo = {
            loggedin: cli.session.loggedin,
            roles: cli.session.data.roles,
            userid: cli.session.data._id,
            logintime: cli.session.data.logintime,
            displayname: cli.session.data.displayname,
            admin: cli.session.data.admin,
            god: cli.session.data.god,
            user: cli.session.data.user,
            power: cli.session.data.power,
            site: cli.routeinfo.configname
        };
    }

    this.injectSessionInCli = function (cli, cb) {
        var ids = cli.cookies.lmlsid;
        var injected = false;
        if (typeof ids !== 'object') {
            ids = [ids || ""];
        }

        for (var i = 0; i < ids.length; i++) {
            var curSesh = _sesh[ids[i]];

            if (curSesh && cli.routeinfo.configname == curSesh.data.site) {
                cli.session = curSesh;
                seshToUserInfo(cli);

                injected = true;
                break;
            }
        }

        if (injected) {
            cb(true);
        } else {
            db.findToArray(cli._c, "sessions", {token : ids[0]}, function(err, arr) {
                if (arr.length == 0) {
                    cli.session = new UserSesh();   
                    cb(false);
                } else {
                    if (arr[0].data.site == cli.routeinfo.configname) {
                        cli.session = arr[0];
                        seshToUserInfo(cli);
                        _sesh[cli.session.token] = arr[0];

                        cb(true);
                    } else {
                        cb(false);
                    }
                }
            });
        }
    };

    this.createSessionInCli = function (cli, userObj) {
        cli.session = this.createSession();
        _sesh[cli.session.token] = cli.session;
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
        cli.session.data.power = 999;
        cli.session.data.notifications = [];

        // Load notifications in db
        db.findToArray(cli._c, 'notifications', {
            userID: db.mongoID(cli.session.data._id)
        }, function (err, arr) {
            cli.session.data.notifications = arr.slice(0, 4);
            // Find the maximum power the user has
            entities.maxPower(cli, function (maxUserPower) {
                cli.session.data.power = maxUserPower;
                cli.session.lastupdate = new Date();
                // No need for callback
                db.insert(cli._c, 'sessions', cli.session, function () {});
            });
        });

        this.setCookieToCli(cli);
    };

    this.removeSession = function (cli, callback) {
        log('Session', "Destroying session for token " + cli.session.token);
        // Remove session from db
        db.remove(cli._c, 'sessions', {
            token: cli.session.token
        }, function () {
            // Remove from memory
            _sesh[cli.session.token] = undefined;
            delete _sesh[cli.session.token];

            callback();
        });
    }

    this.saveSession = function (cli, callback) {
        db.update(cli._c, 'sessions', {
            token: cli.session.token,
            lastupdate : new Date()
        }, cli.session, callback);
    };

    this.getSessionFromSID = function (sid) {
        return _sesh[sid];
    };

    this.getSessions = function () {
        return _sesh;
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
                                _sesh[sesh.token] = sesh;
                                fetchNext();
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
