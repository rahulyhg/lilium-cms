var inbound = require('./inbound.js');
var _c = require('./config.js');
var log = require('./log.js');
var cli = require('./clientobject.js');
var sessionManager = require('./session.js');
var log = require('./log.js');
var db = require('./includes/db.js');
var hooks = require('./hooks.js');
var sites = require('./sites.js');

var io;
var sockets = {};
var groups = {};

var LiliumSocket = function (socket, session) {
    this.socket = socket;
    this.session = session;
    this.clientId = session.data._id;
    this.config = _c.fetchConfig(session.data.site);

    if (!sockets[this.clientId]) {
        sockets[this.clientId] = new Object();
        sockets[this.clientId].sockets = new Object();
    }

    sockets[this.clientId].sockets[this.socket.id] = this.socket;
    sockets[this.clientId].displayname = this.session.data.displayname;
    sockets[this.clientId].power = this.session.data.power;

    this.socket.liliumsocket = this;
};

LiliumSocket.prototype.joinGroup = function (grp, abs) {
    var site = abs ? "" : this.session.data.site + '_';
    this.socket.join(site + grp);
};

LiliumSocket.prototype.bind = function () {
    this.socket.on('join', this.join);
    this.socket.on('notification-interaction', this.notificationInteraction);
    this.socket.on('notification-view', this.notificationView);
    this.socket.on('emittogroup', this.emitToGroup);
    this.socket.on('private', this.private);
    this.socket.on('spy', this.spy);
    this.socket.on('urlChanged', this.urlChanged);
    this.socket.on('broadcast', this.broadcast);
    this.socket.on('disconnect', this.disconnect);
    this.socket.on('alert', this.alert);
    this.socket.on('error', this.error);

    return this;
};

LiliumSocket.prototype.join = function (groupName) {
    var ls = this.liliumsocket;
    if (groups[ls.session.data.site + '_' +groupName] || groups[groupName]) {
        // Check for needed roles
        if (groupName.indexOf("lmlsite_") === 0) {
            this.join(groupName);
            groups[groupName].users.push({
                session: ls.session.sessionId,
                client: ls.clientId
            });
            this.emit('debug', {
                success: true,
                msg: 'Joined broadcast group for site : ' + ls.session.data.site
            });
        } else if (typeof groups[ls.session.data.site+ '_' +groupName].role == 'undefined' || ls.session.data.roles.indexOf(groups[ls.session.data.site + '_' +groupName].role) !== -1) {
            this.join(groupName);
            groups[ls.session.data.site +'_'+ groupName].users.push({
                session: ls.session.sessionId,
                client: ls.clientId
            });
            this.emit('debug', {
                success: true,
                msg: 'Joined ' + groupName + ' group.'
            });
        } else {
            this.emit('err', {
                success: false,
                msg: 'Permission denied for group: ' + groupName + ' on site ' + ls.session.data.site
            });
        }

    } else {
        this.emit('err', {
            success: false,
            msg: 'Group "' + groupName + '" not found on site ' + ls.session.data.site
        });
    }
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
LiliumSocket.prototype.emitToGroup = function (emission) {
    if (emission.group) {
        var ls = this.liliumsocket;
        if (groups[ls.session.data.site] && groups[ls.session.data.site][emission.group]) {
            if (this.rooms[emission.group]) {
                this.broadcast.to(emission.group).emit('group', emission.data);
            } else {
                this.emit('err', {
                    msg: 'Notification failed : not in group "' + emission.group + '"'
                });
            }

        } else {
            this.emit('err', 'Group ' + emission.group + ' not found');
        }
    }
};
LiliumSocket.prototype.private = function (emission) {
    // Check if target exists
    if (sockets[emission.id]) {

        for (var index in sockets[emission.id].sockets) {
            if (io.sockets.connected[sockets[emission.id].sockets[index]]) {
                io.sockets.connected[sockets[emission.id].sockets].emit('private', emission.data);
            }
        }
    }

};
LiliumSocket.prototype.spy = function (data) {
    var ls = this.liliumsocket;
    // Make a list of all currently loggedin users
    var loggedInUsers = {};
    for (var clientId in sockets) {
        if (sockets[clientId].power > ls.session.data.power) {
            loggedInUsers[clientId] = {};
            loggedInUsers[clientId].pages = [];
            loggedInUsers[clientId].displayname = sockets[clientId].displayname;
            // Each sockets, get the id
            for (var socketid in sockets[clientId].sockets) {
                var info = {};
                info.url = sockets[clientId].sockets[socketid].url;
                info.time = sockets[clientId].sockets[socketid].time;

                loggedInUsers[clientId].pages.push(info);
            }
        }

    }

    this.emit('spy', loggedInUsers);

};
LiliumSocket.prototype.urlChanged = function (url) {
    var ls = this.liliumsocket;
    sockets[ls.clientId].sockets[this.id].url = url;
    sockets[ls.clientId].sockets[this.id].time = new Date();

    var clientUrls = ls.createCurrentUserPages();
    for (var index in groups['spy'].users) {
        var spySession = sessionManager.getSessionFromSID(groups['spy'].users[index].session);
        // Check if user has required power
        if (ls.session.data.power > spySession.data.power) {
            for (var i in sockets[spySession.data._id].sockets) {
                sockets[spySession.data._id].sockets[i].emit('spy-update', {
                    id: ls.clientId,
                    data: clientUrls,
                    displayname: sockets[ls.clientId].displayname
                });;
            }
        }
    }

};
LiliumSocket.prototype.broadcast = function (emission) {
    var ls = this.liliumsocket;

    // Only admin or lilium can
    if (ls.session.data.roles.indexOf('admin') !== -1) {
        // Broadcast to its site only
    }

    if (ls.session.data.roles.indexOf('lilium') !== -1) {
        // Broadcast to all site?
    }

};
LiliumSocket.prototype.disconnect = function () {
    var ls = this.liliumsocket;
    sockets[ls.clientId].sockets[ls.socket.id] = undefined;
    delete sockets[ls.clientId].sockets[ls.socket.id];

    if (sockets[ls.clientId].sockets.length == 0) {
        sockets[ls.clientId] = undefined;
        delete sockets[ls.clientId];
    }

    // Notify users currently spying
    var clientUrls = ls.createCurrentUserPages();
    io.sockets.in('spy').emit('spy-update', {
        id: ls.clientId,
        data: clientUrls,
        displayname: sockets[ls.clientId].displayname
    });
};
LiliumSocket.prototype.alert = function () {
    this.broadcast.emit('message', {
        username: this.username
    });
};

LiliumSocket.prototype.createCurrentUserPages = function () {
    clientUrls = [];

    for (var index in sockets[this.clientId].sockets) {
        var info = {};

        info.url = sockets[this.clientId].sockets[index].url;
        info.time = sockets[this.clientId].sockets[index].time;
        clientUrls.push(info);
    };

    return clientUrls;
};

LiliumSocket.prototype.error = function (err) {
    log('Socket', 'Error with socket : ' + err.message);
    log('Stacktrace', err.stack);
};

var Notification = function () {
    var that = this;

    var onSocketConnection = function (socket) {
        // Parse cookie and get session id
        var sessionId = that.getSessionIDFromCookie(socket.handshake.headers.cookie);
        // Get session and get client id
        var session = sessionManager.getSessionFromSID(sessionId);
        if (session) {
            session.sessionId = sessionId;
            new LiliumSocket(socket, session).bind().joinGroup('lmlsite_' + session.data.site, true);
        }
    };

    this.init = function () {
        registerLivevars();
        io = inbound.io();

        //Create default groups

        _c.eachSync(function (conf) {
            that.createGroup('lmlsite_' + conf.id);
        });

        hooks.bind('site_initialized', 3000, function (conf) {
            that.createGroup('lmlsite_' + conf.id);
        });

        that.createGroup('spy');

        io.on('connection', onSocketConnection);
    };

    this.emitToUser = function (userID, message) {
        // Send to every sockets connected by the user (for multi-tab)
        for (var index in sockets[userID].sockets) {
            var socket = sockets[userID].sockets[index];
            if (socket) {
                socket.emit('message', message);
            }
        }
    };

    this.notifyUser = function (userID, dbId, notification) {
        //Check if user will receive notification
        notification.interacted = false;
        notification.userID = db.mongoID(userID);
        notification.date = new Date();


        // Add it in the user session if it exsists
        db.findToArray(dbId, 'sessions', {
            "data._id": notification.userID
        }, function (err, arr) {
            if (arr && arr[0]) {
                insertNotificationInSession(arr[0].token, notification, dbId);
            }
        })

        // Add notification to db
        db.insert(dbId, 'notifications', notification, function () {});

        // Send to every sockets connected by the user (for multi-tab)
        for (var index in sockets[userID].sockets) {
            var socket = sockets[userID].sockets[index];
            if (socket) {
                socket.emit('notification', notification);
            }
        }
    };

    var insertNotificationInSession = function (sessionId, notification, dbId) {
        var session = sessionManager.getSessionFromSID(sessionId);

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

    this.notifyGroup = function (groupName, notification, site) {

        // Find users in db that has the group role
        notification.date = new Date();
        notification.interacted = false;

        // Create notif to one site only
        if (site) {
            if (groups[site +'_'+ groupName]) {
                notify(site, groups[site +'_'+ groupName]);
            }
        } else {
            // Create notif to all sites
            for (var i in groups) {
                if (groups[i +'_'+ groupName]) {
                    notify(i, groups[i +'_'+ groupName]);
                }
            }
        }

        var notify = function (site, group) {
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
                    "rights.name": group.role
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
                    "roles.name": group.role
                }
                        }, {
                $group: {
                    _id: "$token"
                }
                        }], function (result) {
                insertBatchNotificationInSessions(result, notification, site);
            });

            io.sockets.in(site + '-' +groupName).emit('notification', notification);
        };
    };

    this.emitToGroup = function (groupName, data, type, site) {
        if (site) {
            if (groups[site] && groups[site +'_'+ groupName]) {
                io.sockets.in(site + '_' +groupName).emit(type || 'notification', data);
            }
        } else if (site === false) {
            if (groups[groupName]) {
                io.sockets.in(groupName).emit(type || 'notification', data);
            }
        } else {
            for (var site in groups) {
                if (groups[site +'_'+ groupName]) {
                    io.sockets.in(site + '_' +groupName).emit(type || 'notification', data);
                }
            }
        }

    };

    this.emitToWebsite = function (siteid, data, type) {
        this.emitToGroup('lmlsite_' + siteid, data, type, false);
    };

    this.removeGroup = function (groupName, site) {
        if (groups[groupName]) {
            groups[groupName] = undefined;
            delete groups[groupName];
        } else if (groups[site +'_'+ groupName]) {
            groups[site +'_'+ groupName] = undefined;
            delete groups[site +'_'+ groupName];
        }
    };

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
        io.sockets.emit(msgType || 'message', data);
    };

    this.createGroup = function (groupName, role, site) {
        if (site) {
            log('Noticifactions', 'Creating group ' + site + '_' + groupName);
            groups[site + '_' + groupName] = groups[site + '_' + groupName] ? groups[site + '_' + groupName] : {};
            groups[site + '_' + groupName].role = role;
            groups[site + '_' + groupName].users = [];
        } else {
            log('Notifications', 'Creating group ' + groupName);
            groups[groupName] = {};
            groups[groupName].role = role;
            groups[groupName].users = [];
        }

    };

    this.getSessionIDFromCookie = function (cookieString) {
        var cookies = {};
        cookieString.split(';').forEach(function (cookie) {
            var keyVal = cookie.split('=');
            cookies[keyVal.shift().trim()] = decodeURI(keyVal.join('=').trim());
        });

        return cookies['lmlsid'];
    };

    var registerLivevars = function () {
        //Get last 5 of user
        //Get last x of user
        //Get x to y of user
    };
}

module.exports = new Notification();
