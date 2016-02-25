var inbound = require('./inbound.js');
var _c = require('./config.js');
var log = require('./log.js');
var cli = require('./clientobject.js');
var sessionManager = require('./session.js');
var log = require('./log.js');

var sockets = {};
var groups = {};

var Notification = function() {
    var that = this;
    var io;
	this.init = function() {
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
                            if (session.data.roles.indexOf(groups[groupName]) !== -1) {
                                socket.join(groupName);
                                socket.emit('debug', {success: true, msg: 'Joined ' + groupName + ' group.'});
                            } else {
                                socket.emit('err', {success: false, msg: 'Permission denied for group: ' + groupName});
                            }

                        } else {
                            socket.emit('err', {success: false, msg: 'Group "' + groupName + '" not found.'});
                        }

                    });

                    socket.on('emittogroup', function(emission) {
                        if (emission.group) {
                            if (groups[emission.group]) {
                                if(socket.rooms[emission.group]) {
                                    socket.broadcast.to(emission.group).emit('group', emission.data);
                                } else {
                                    socket.emit('err', {msg:'Notification failed : not in group "' + emission.group +'"'});
                                }

                            } else {
                                socket.emit('err', 'Group ' + emission.group + ' not found');
                            }
                        }

                    });

                    socket.on('private', function(emission){
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

          			socket.on('disconnect', function(){
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
        // Send to every sockets connected by the user (for multi-tab)
        for (var index in sockets[userID]) {
            var socket = sockets[userID][index];
            if (socket) {
                socket.emit('notification', notification);
            }
        }
    }

    this.notifyGroup = function(groupName, notification) {
        if (groups[groupName]) {
            io.sockets.in(groupName).emit('notification', notification);
        }
    }

    this.emitToGroup = function(groupName, data) {
        if (groups[groupName]) {
            io.sockets.in(groupName).emit('notification', notification);
        }
    };

    this.removeGroup = function (groupName) {
        if (groups[groupName]) {
            groups[groupName] = undefined;
            delete groups[groupName];
        }
    };

    this.broadcastNotification = function(notification) {
        io.sockets.emit('notification', notification);
    }

    this.broadcast = function(data) {
        io.sockets.emit('message', data);
    };

    this.createGroup = function(groupName, role) {
        groups[groupName] = role;
    };

    this.getSessionIDFromCookie = function(cookieString) {
        var cookies = {};
        cookieString.split(';').forEach(function(cookie) {
            var keyVal = cookie.split('=');
            cookies[keyVal.shift().trim()] = decodeURI(keyVal.join('=').trim());
        });

    return cookies['lmlsid'];
    };
}

module.exports = new Notification();
