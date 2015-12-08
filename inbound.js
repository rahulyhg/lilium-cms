var _c = require('./config.js').default,
    _http = require('http'),
    _sesh = require('sesh/lib/core.js').magicSession(),
    __inbound = new (function() {
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
		callbacks[hook].push(cb);
	};

	this.start = function() {
		server.listen(_c.server.port, handleConn);
	};
	
	var init = function() {
		server = _http.createServer(handleReq);
	};

	init();
})();

module.exports = __inbound;
