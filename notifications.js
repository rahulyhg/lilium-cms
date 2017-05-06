var _c = require('./config.js');
var log = require('./log.js');
var cli = require('./clientobject.js');
var sessionManager = require('./session.js');
var log = require('./log.js');
var db = require('./includes/db.js');
var hooks = require('./hooks.js');
var sites = require('./sites.js');
var livevars = require('./livevars.js');
var sharedcache = require('./sharedcache.js');

var io;
var sockets = {};
var groups = {};
var namespaces = [];

var idToNamespace = {};

var LiliumSocket = function (socket, session) {
    this.socket = socket;
    this.session = session;
    this.clientId = session.data._id;
    this.config = _c.fetchConfig(session.data.site);
    this.sid = socket.id;

    this.socket.liliumsocket = this;
};


LiliumSocket.prototype.bind = function () {
    this.socket.on('join', this.join);
    this.socket.on('notification-interaction', this.notificationInteraction);
    this.socket.on('notification-view', this.notificationView);
    this.socket.on('broadcast', this.broadcast);
    this.socket.on('disconnect', this.disconnect);
    this.socket.on('alert', this.alert);
    this.socket.on('error', this.error);

    return this;
};

LiliumSocket.prototype.join = function (groupName) {
    var ls = this.liliumsocket;
};

LiliumSocket.prototype.notificationInteraction = function (notifId) {
    var ls = this.liliumsocket;
    var id = db.mongoID(notifId);
    var userId = db.mongoID(ls.clientId);
    // Update notification as interacted
    db.update(ls.config, 'notifications', {
        _id: id,
        userID: userId
    }, {
        interacted: true
    }, function (err, res) {
        // No need for confirmation client side
    });

    // Find notification in session
    for (var index in ls.session.data.notifications) {
        if (ls.session.data.notifications[index]._id == notifId) {
            ls.session.data.notifications[index].interacted = true;
            break;
        }
    }

    // Bypass session manager taking only a cli
    var cli = {};
    cli.session = ls.session;
    cli._c = {};
    cli._c.id = ls.session.data.site;

    // Save it
    sessionManager.saveSession(cli, function () {});
};

LiliumSocket.prototype.notificationView = function () {
    var ls = this.liliumsocket;
    ls.session.data.newNotifications = 0;
    // Bypass session manager taking only a cli
    var cli = {};
    cli.session = ls.session;
    cli._c = {};
    cli._c.id = ls.session.data.site;
    // Save it
    sessionManager.saveSession(cli, function () {});

};

LiliumSocket.prototype.broadcast = function (emission) {
    var ls = this.liliumsocket;
};

LiliumSocket.prototype.disconnect = function () {
    var ls = this.liliumsocket;
    var sid = ls.sid;
    var uid = ls.clientId;
    
    var memObj = {};
    sharedcache.socket(uid, 'remove', sid, function(remainingSessions) {
        var sessionCount = remainingSessions.length;
        for (var i = 0; i < namespaces.length; i++) {
            io.of(namespaces[i]).emit('userstatus', {
                id: ls.clientId,
                displayname: ls.session.data.displayname,
                status : !sessionCount ? 'offline' : 'online',
                seshCount : sessionCount
            });
        }
    });
};

LiliumSocket.prototype.alert = function () {
    this.broadcast.emit('message', {
        username: this.username
    });
};

LiliumSocket.prototype.error = function (err) {
    log('Socket', 'Error with socket : ' + err.message, 'err');
    log('Stacktrace', err.stack, 'err');
};

var Notification = function () {
    var that = this;

    var onSocketConnection = function (socket, uid) {
        // Parse cookie and get session id
        var cookies = socket.handshake.headers.cookie;
        var split = cookies.split(';');
        var sessionId;

        for (var i = 0; i < split.length; i++) {
            if (split[i].indexOf('lmlsid' + uid) != -1) {
                sessionId = split[i].split('=')[1];
            }
        }

        if (sessionId) {
            // Get session and get client id
            sessionManager.getSessionFromSID(sessionId, function(session) {
                if (session) {
                    sharedcache.socket(session.data._id, 'add', socket.id, function() { 
                        session.sessionId = sessionId;
                        new LiliumSocket(socket, session).bind();

                        for (var i = 0; i < namespaces.length; i++) {
                            io.of(namespaces[i]).emit('userstatus', {
                                id: session.data._id,
                                displayname: session.data.displayname,
                                status : 'online',
                                seshCount : 1
                            });
                        }
                    });
                }
            });
        }
    };

    this.init = function () {
        if (global.liliumenv.mode != "script") {
            io = require('./inbound.js').io();

            log('Notifications', 'Creating site groups', 'live');
            _c.eachSync(function (conf) {
                var url = conf.server.url + "/";
                var path = url.substring(url.indexOf('/', 2));
                log('Socket', 'Created connection for namespace : ' + path + conf.uid, 'live');
                (function (uid) { 
                    io.of(path + uid).on('connection', function(socket) {
                        onSocketConnection(socket, uid);
                    });
                })(conf.uid);
                
                namespaces.push(path + conf.uid);
                idToNamespace[conf.id] = path + conf.uid
            });

            log('Notifications', 'Sockets ready', 'live');
        }
    };

    this.notifyUser = function (userID, dbId, notification, difftype) {
        //Check if user will receive notification
        notification.interacted = false;
        notification.userID = db.mongoID(userID);
        notification.date = new Date();

        // Add it in the user session if it exsists
        db.insert(dbId, 'notifications', notification, function () {});

        // Send to every sockets connected by the user (for multi-tab)
        sharedcache.getSocketID(userID, function(sockets) {
            for (var i = 0; i < sockets.length; i++) {
                var split = sockets[i].split('#');
                
                log('Notifications', 'Emit to socket id ' + split[1] + " of " + split[0], 'live')
                io.of(split[0]).to(sockets[i]).emit(difftype || 'notification', notification);
            }
        });
    };

    var insertNotificationInSession = function (sessionId, notification, dbId) {
        sessionManager.getSessionFromSID(sessionId, function(session) {
            if (session) {
                session = insertNotif(session, notification);

                // Bypass session manager taking only a cli
                var cli = {};
                cli.session = session;
                cli._c = {};
                cli._c.id = dbId;
                // Save it
                sessionManager.saveSession(cli, function () {});
            }
        });
    };

    var insertBatchNotificationInSessions = function (sessionsIDs, notification, site) {
        var sessions = sessionManager.getSessions();
        var tokens = [];
        for (var sessionID in sessionsIDs) {
            var session = sessions[sessionsIDs[sessionID]._id];
            if (session) {
                tokens.push(sessionsIDs[sessionID]._id)
                insertNotif(session, notification);
            }
        }

        db.update((site || _c.default()), 'sessions', {
            'token': {
                '$in': tokens
            }
        }, {
            '$push': {
                'data.notifications': notification
            },
            $inc: {
                'data.newNotifications': 1
            }
        }, function (err, result) {}, true, false, true);
    };

    var insertNotif = function (session, notification) {
        if (session) {
            if (!session.data.newNotifications) {
                session.data.newNotifications = 0;
            }

            session.data.newNotifications += 1;

            if (!session.data.notifications || typeof session.data.notifications.push == 'undefined') {
                session.data.notifications = [];
            }

            // Only keep last 5 notifs in session
            if (session.data.notifications.length >= 5) {
                //Remove last notification (oldest)
                session.data.notifications.shift();
            }
            //Remove last notification (oldest)
            session.data.notifications.push(notification);
            return session;
        }
    };

    this.emitToWebsite = function (siteid, data, type) {
        io && io.of(idToNamespace[siteid]).emit(type || 'notification', data);
    };

    this.messageNotif = function(user, msg, type) {
        sharedcache.getSocketID(user, function(sockets) {
            for (var i = 0; i < sockets.length; i++) {
                var split = sockets[i].split('#');
                
                log('Notifications', 'Emit to socket id ' + split[1] + " of " + split[0], 'live')
                io.of(split[0]).to(sockets[i]).emit(type || 'message', msg);
            }
        });
    };

    this.createGroup = function() {
        log('Notifications', 'Warning : Call to deprecated function createGroup', 'warn');
    }

    this.broadcastNotification = function (notification) {
        notification.date = new Date();
        notification.interacted = false;
        var sites = sites.getSites();

        var broadcast = function (site) {
            // Create notification for users that have dash access
            db.aggregate(site, 'entities', [{
                "$unwind": "$roles"
            }, {
                "$lookup": {
                    from: "roles",
                    localField: "roles",
                    "foreignField": "name",
                    as: "rights"
                }
            }, {
                "$match": {
                    "rights.rights": {
                        $in: ["dash"]
                    }
                }
            }, {
                "$project": {
                    "_id": 0,
                    "userID": "$_id",
                    "type": {
                        "$literal": notification.type
                    },
                    "msg": {
                        "$literal": notification.msg
                    },
                    "title": {
                        "$literal": notification.title
                    },
                    "url": {
                        "$literal": notification.url
                    },
                    "interacted": {
                        "$literal": false
                    },
                    "date": {
                        "$literal": notification.date
                    }
                }
            }], function (result) {
                // Insert Notifications
                db.insert(site, 'notifications', result, function (err, r) {});
            });

            // Insert notification in all the sessions
            // Find sessions that have dash access
            db.aggregate(site, 'sessions', [{
                "$unwind": "$data.roles"
            }, {
                $lookup: {
                    from: "roles",
                    localField: "data.roles",
                    foreignField: "name",
                    as: "roles"
                }
            }, {
                $match: {
                    "roles.rights": {
                        $in: ["dash"]
                    }
                }
            }, {
                $group: {
                    _id: "$token"
                }
            }], function (result) {
                insertBatchNotificationInSessions(result, notification, site);
            });
            // Broadcast for user connected
        };

        for (var i in sites) {
            broadcast(sites[i].id);
        }

        io.sockets.emit('notification', notification);
    };

    this.broadcast = function (data, msgType) {
        for (var i = 0; i < namespaces.length; i++) {
            io.of(namespaces[i]).emit(msgType || 'message', data);
        }
    };

    this.registerLiveVar = function() {
        livevars.registerLiveVariable('notifications', function(cli, levels, params, cb) {
            db.join(cli._c, 'notifications', [
                {$match : {userID : db.mongoID(cli.userinfo.userid)}},
                {$sort : {_id : -1}},
                {$limit : 10},
                {$sort : {_id : 1}}
            ], function(result) {
                cb(result);
            });
        });

        // Not working anymore
        livevars.registerLiveVariable('online', function(cli, levels, params, cb) {
            if (levels[0] == "list") {
                sharedcache.getSocketID(false, function(sockets) {
                    cb(sockets);
                });
            } else {
                return cb({users : [], sessions : {}});

                var newnet = {
                    users : net.users,
                    sessions : {}
                };
                for (var sid in net.sessions) {
                    newnet.sessions[sid] = {
                        session : net.sessions[sid].session,
                        client :  net.sessions[sid].client,
                        site :  net.sessions[sid].site,
                        user :  net.sessions[sid].user
                    };
                }

                cb(newnet);
            }
        }, ["dash"]);
    };
};

module.exports = new Notification();
