var inbound = require('./inbound.js');
var _c = require('./config.js');
var log = require('./log.js');
var cli = require('./clientobject.js');
var sessionManager = require('./session.js');
var log = require('./log.js');
var db = require('./includes/db.js');

var sockets = {};
var groups = {};

var Notification = function() {
    var that = this;
    var io;

    this.init = function() {
        registerLivevars();
        io = inbound.io();

        //Create default groups
        that.createGroup('admin', 'admin');
        that.createGroup('lilium', 'lilium');
        that.createGroup('spy');

        io.on('connection', function(socket) {

            // Parse cookie and get session id
            var sessionId = that.getSessionIDFromCookie(socket.handshake.headers.cookie);
            // Get session and get client id
            var session = sessionManager.getSessionFromSID(sessionId);
            if (session) {
                var clientId = session.data._id;

                if (!sockets[clientId]) {
                    sockets[clientId] = {};
                    sockets[clientId].sockets = {};
                }
                sockets[clientId].sockets[socket.id] = socket;
                sockets[clientId].displayname = session.data.displayname;


                socket.on('join', function(groupName) {
                    // Group exists
                    if (groups[groupName]) {

                        // Check for needed roles
                        if (typeof groups[groupName].role == 'undefined' || session.data.roles.indexOf(groups[groupName].role) !== -1) {
                            socket.join(groupName);
                            groups[groupName].users.push({
                                session: sessionId,
                                client: clientId
                            });
                            socket.emit('debug', {
                                success: true,
                                msg: 'Joined ' + groupName + ' group.'
                            });
                        } else {
                            socket.emit('err', {
                                success: false,
                                msg: 'Permission denied for group: ' + groupName
                            });
                        }

                    } else {
                        socket.emit('err', {
                            success: false,
                            msg: 'Group "' + groupName + '" not found.'
                        });
                    }

                });

                socket.on('notification-interaction', function(notifId) {
                    var id = db.mongoID(notifId);
                    var userId = db.mongoID(clientId);
                    // Update notification as interacted
                    db.update(_c.default(), 'notifications', {
                        _id: id,
                        userID: userId
                    }, {
                        interacted: true
                    }, function(err, res) {
                        // No need for confirmation client side
                    });

                    // Find notification in session
                    for (var index in session.data.notifications) {
                        if (session.data.notifications[index]._id == notifId) {
                            session.data.notifications[index].interacted = true;
                            break;
                        }
                    }

                    // Bypass session manager taking only a cli
                    var cli = {};
                    cli.session = session;

                    // Save it
                    sessionManager.saveSession(cli, function() {});

                });

                socket.on('notification-view', function() {
                    session.data.newNotifications = 0;
                    // Bypass session manager taking only a cli
                    var cli = {};
                    cli.session = session;

                    // Save it
                    sessionManager.saveSession(cli, function() {});
                });

                socket.on('emittogroup', function(emission) {
                    if (emission.group) {
                        if (groups[emission.group]) {
                            if (socket.rooms[emission.group]) {
                                socket.broadcast.to(emission.group).emit('group', emission.data);
                            } else {
                                socket.emit('err', {
                                    msg: 'Notification failed : not in group "' + emission.group + '"'
                                });
                            }

                        } else {
                            socket.emit('err', 'Group ' + emission.group + ' not found');
                        }
                    }

                });

                socket.on('private', function(emission) {
                    // Check if target exists
                    if (sockets[emission.id]) {

                        for (var index in sockets[emission.id].sockets) {
                            if (io.sockets.connected[sockets[emission.id].sockets[index]]) {
                                io.sockets.connected[sockets[emission.id].sockets].emit('private', emission.data);
                            }
                        }
                    }
                });

                socket.on('spy', function(data) {
                    // Only admins or lilium can access this feature
                    if (session.data.roles.indexOf('admin') !== -1 || session.data.roles.indexOf('lilium') !== -1) {
                        // Make a list of all currently loggedin users
                        var loggedInUsers = {};
                        for (var clientId in sockets) {
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

                        socket.emit('spy', loggedInUsers);
                    }
                });

                socket.on('urlChanged', function(url){
                    sockets[clientId].sockets[socket.id].url = url;
                    sockets[clientId].sockets[socket.id].time = new Date();

                    var clientUrls = createCurrentUserPages();
                    io.sockets.in('spy').emit('spy-update', {id: clientId, data : clientUrls, displayname: sockets[clientId].displayname});
                });

                socket.on('broadcast', function(emission) {

                    // Only admin or lilium can
                    if (session.data.roles.indexOf('admin') !== -1) {
                        // Broadcast to its site only
                    }

                    if (session.data.roles.indexOf('lilium') !== -1) {
                        // Broadcast to all site?
                    }
                });

                socket.on('disconnect', function() {
                    createCurrentUserPages();
                    sockets[clientId].sockets[socket.id] = undefined;

                    delete sockets[clientId].sockets[socket.id];

                    if (sockets[clientId].sockets.length == 0) {
                        sockets[clientId] = undefined;
                        delete sockets[clientId];
                    }

                    // Notify users currently spying
                    var clientUrls = createCurrentUserPages();
                    io.sockets.in('spy').emit('spy-update', {id: clientId, data : clientUrls, displayname: sockets[clientId].displayname});

                });

                socket.on('alert', function() {
                    socket.broadcast.emit('message', {
                        username: socket.username
                    });
                });
            }

            var createCurrentUserPages = function() {
                clientUrls = [];

                for (var index in sockets[clientId].sockets) {
                    var info = {};

                    info.url = sockets[clientId].sockets[index].url;
                    info.time = sockets[clientId].sockets[index].time;
                    clientUrls.push(info);
                };

                return clientUrls;
            }
        });
    };

    this.emitToUser = function(userID, message) {
        // Send to every sockets connected by the user (for multi-tab)
        for (var index in sockets[userID].sockets) {
            var socket = sockets[userID].sockets[index];
            if (socket) {
                socket.emit('message', message);
            }
        }
    };

    this.notifyUser = function(userID, notification) {
        //Check if user will receive notification
        notification.interacted = false;
        notification.userID = db.mongoID(userID);
        notification.date = new Date();


        // Add it in the user session if it exsists
        db.findToArray(_c.default(), 'sessions', {
            "data._id": notification.userID
        }, function(err, arr) {
            if (arr && arr[0]) {
                insertNotificationInSession(arr[0].token, notification);
            }
        })

        // Add notification to db
        db.insert(_c.default(), 'notifications', notification, function() {});

        // Send to every sockets connected by the user (for multi-tab)
        for (var index in sockets[userID].sockets) {
            var socket = sockets[userID].sockets[index];
            if (socket) {
                socket.emit('notification', notification);
            }
        }
    };

    var insertNotificationInSession = function(sessionId, notification) {
        var session = sessionManager.getSessionFromSID(sessionId);

        if (session) {
            session = insertNotif(session, notification);

            // Bypass session manager taking only a cli
            var cli = {};
            cli.session = session;
            // Save it
            sessionManager.saveSession(cli, function() {
            });
        }

    };

    var insertBatchNotificationInSessions = function(sessionsIDs, notification) {
        var sessions = sessionManager.getSessions();
        var tokens = [];
        for (var sessionID in sessionsIDs) {
            var session = sessions[sessionsIDs[sessionID]._id];
            if (session) {
                tokens.push(sessionsIDs[sessionID]._id)
                insertNotif(session, notification);
            }
        }

    	db.update(_c.default(), 'sessions', {'token' : {'$in': tokens}}, {'$push':{'data.notifications': notification}, $inc : {'data.newNotifications' : 1}} , function(err, result) {}, true, false, true);
    };

    var insertNotif = function(session, notification) {
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

    this.notifyGroup = function(groupName, notification) {
        notification.date = new Date();
        notification.interacted = false;

        if (groups[groupName]) {
            // Find users in db that has the group role
            db.aggregate(_c.default(), 'entities', [{
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
                    "rights.name": groups[groupName].role
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
            }], function(result) {
                // Insert Notifications
                db.insert(_c.default(), 'notifications', result, function(err, r) {});
            });


            // Insert notification in all the sessions
            // Find sessions that have dash access
            db.aggregate(_c.default(), 'sessions', [{
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
                    "roles.name": groups[groupName].role
                }
            }, {
                $group: {
                    _id: "$token"
                }
            }], function(result) {
                insertBatchNotificationInSessions(result, notification);
            });

            io.sockets.in(groupName).emit('notification', notification);
        }
    };

    this.emitToGroup = function(groupName, data) {
        if (groups[groupName]) {
            io.sockets.in(groupName).emit('notification', notification);
        }
    };

    this.removeGroup = function(groupName) {
        if (groups[groupName]) {
            groups[groupName] = undefined;
            delete groups[groupName];
        }
    };

    this.broadcastNotification = function(notification) {
        notification.date = new Date();
        notification.interacted = false;

        // Create notification for users that have dash access
        db.aggregate(_c.default(), 'entities', [{
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
        }], function(result) {
            // Insert Notifications
            db.insert(_c.default(), 'notifications', result, function(err, r) {});
        });

        // Insert notification in all the sessions
        // Find sessions that have dash access
        db.aggregate(_c.default(), 'sessions', [{
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
        }], function(result) {
            insertBatchNotificationInSessions(result, notification);
        });
        // Broadcast for user connected
        io.sockets.emit('notification', notification);
    };

    this.broadcast = function(data) {
        io.sockets.emit('message', data);
    };

    this.createGroup = function(groupName, role) {
        groups[groupName] = {};
        groups[groupName].role = role;
        groups[groupName].users = [];
    };

    this.getSessionIDFromCookie = function(cookieString) {
        var cookies = {};
        cookieString.split(';').forEach(function(cookie) {
            var keyVal = cookie.split('=');
            cookies[keyVal.shift().trim()] = decodeURI(keyVal.join('=').trim());
        });

        return cookies['lmlsid'];
    };

    var registerLivevars = function() {
        //Get last 5 of user
        //Get last x of user
        //Get x to y of user
    };
}

module.exports = new Notification();
