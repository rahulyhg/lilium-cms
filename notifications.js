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

        io.on('connection', function(socket) {

            // Parse cookie and get session id
            var sessionId = that.getSessionIDFromCookie(socket.handshake.headers.cookie);
            // Get session and get client id
            var session = sessionManager.getSessionFromSID(sessionId);
            if (session) {
                var clientId = session.data._id;

                if (!sockets[clientId]) {
                    sockets[clientId] = {};
                }
                sockets[clientId][socket.id] = socket;


                socket.on('join', function(groupName) {
                    // Group exists
                    if (groups[groupName]) {

                        // Check for needed roles
                        if (session.data.roles.indexOf(groups[groupName].role) !== -1) {
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
                    db.update('notifications', {
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

                        for (var index in sockets[emission.id]) {
                            if (io.sockets.connected[sockets[emission.id][index]]) {
                                io.sockets.connected[sockets[emission.id]].emit('private', emission.data);
                            }
                        }
                    }
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
                    sockets[clientId][socket.id] = undefined;

                    delete sockets[clientId][socket.id];
                });

                socket.on('alert', function() {
                    socket.broadcast.emit('message', {
                        username: socket.username
                    });
                });
            }

        });
    };

    this.emitToUser = function(userID, message) {
        // Send to every sockets connected by the user (for multi-tab)
        for (var index in sockets[userID]) {
            var socket = sockets[userID][index];
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
        db.findToArray('sessions', {
            "data._id": notification.userID
        }, function(err, arr) {
            if (arr && arr[0]) {
                insertNotificationInSession(arr[0].token, notification);
            }
        })

        // Add notification to db
        db.insert('notifications', notification, function() {});

        // Send to every sockets connected by the user (for multi-tab)
        for (var index in sockets[userID]) {
            var socket = sockets[userID][index];
            if (socket) {
                socket.emit('notification', notification);
            }
        }
    }

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

    }

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

    	db.update('sessions', {'token' : {'$in': tokens}}, {'$push':{'data.notifications': notification}} , function(err, result) {}, true, false);
    }

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
    }

    this.notifyGroup = function(groupName, notification) {
        var notifications = [];

        if (groups[groupName]) {
            for (var key in groups[groupName].users) {
                var tempnotif = extend({}, notification);
                var user = groups[groupName].users[key];

                tempnotif.interacted = false;
                tempnotif.userID = db.mongoID(user.clientId);
                tempnotif.date = new Date();

                notifications.push(tempnotif);
            }
            db.insert('notification', notifications, function() {});

            io.sockets.in(groupName).emit('notification', notification);
        }
    }

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

        // Create notification for users that have dash access
        db.aggregate('entities', [{
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
            db.insert('notifications', result, function(err, r) {});
        });

        // Insert notification in all the sessions
        // Find sessions that have dash access
        db.aggregate('sessions', [{
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
    }

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
    }
}

module.exports = new Notification();
