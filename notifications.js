var inbound = require('./inbound.js');
var _c = require('./config.js');
var log = require('./log.js');

var Notification = function() {
  var io;
  this.init = function() {
    io = inbound.io();
    console.log('Socket server ready');
    io.on('connection', function(socket) {
      socket.on('join', function(name){
        log('sockets', name + ' joined');
      });
      socket.on('disconnect', function(){
        console.log('user disconnected');
      });

      socket.on('alert', function() {
        socket.broadcast.emit('message', {
          username: socket.username
        });
      });

    });
  }

}

module.exports = new Notification();
