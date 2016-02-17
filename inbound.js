var _c = require('./config.js').default,
    _http = require('http'),
    log = require('./log.js'),
    __inbound = new (function() {
  var io;
	var server;
	var callbacks = {
		'onRequest' : [],
		'onConn' : []
	};

	var handleReq = function(req, resp) {
		for (var i = 0; i < callbacks.onRequest.length; i++) {
			callbacks.onRequest[i](req, resp);
		}
	};

	var handleConn = function() {
		for (var i = 0; i < callbacks.onConn.length; i++) {
			callbacks.onConn[i](req, resp);
		}
	};

	this.bind = function(hook, cb) {
		log('Inbound', 'Binding ' + hook + ' to connection');
		callbacks[hook].push(cb);
	};

	this.start = function() {
		log('Inbound', 'Ready to receive requests');
		server.listen(_c.server.port, handleConn);
	};

  this.io = function() {
    return io;
  }

	var init = function() {
		server = _http.createServer(handleReq);
    io = require('socket.io')(server);

	};

	init();
})();

module.exports = __inbound;
