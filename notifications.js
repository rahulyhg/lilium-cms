var inbound = require('./inbound.js');
var _c = require('./config.js');
var log = require('./log.js');
var cli = require('./clientobject.js');
var session = require('./session.js');

var sockets = {};

var Notification = function() {
    var that = this;
    var io;
	this.init = function() {
            io = inbound.io();
    		io.on('connection', function(socket) {

                // Parse cookie and get session id
                var sessionId = that.getSessionIDFromCookie(socket.handshake.headers.cookie);
                // Get session and get client id
                var clientId = session.getSessionFromSID(sessionId).data._id;

                sockets[clientId] = socket;

      			socket.on('join', function(id, name){
      			});

      			socket.on('disconnect', function(){

      			});

      			socket.on('alert', function() {
        			socket.broadcast.emit('message', {
          				username: socket.username
    	    			});
      			});
    		});
  	}

    this.emitToUser = function(userID, message) {
        var socket = sockets[userID];
        if (socket) {
            console.log('emisssion');
            socket.emit('message', message);
        } else {
            console.log('Socket with id : ' + userId + ' not found!');
        }
    }

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
