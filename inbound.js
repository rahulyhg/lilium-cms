var _c = require('./config.js').default,
    _http = require('http'),
    _https = require('https'),
    hooks = require('./hooks.js'),
    log = require('./log.js'),
    fs = require('fs'),
    reqCount = 0,
    totalReqCount = 0,
    __inbound = new (function() {
    	var io = require('socket.io')(server);
	var server;
	var secureServer;

	var handleReq = function(req, resp) {
		reqCount++;
		totalReqCount++;
		resp.on('finish', function() {reqCount--;});

		hooks.trigger('request', {req:req,resp:resp});
	};

	var handleConn = function(req, resp) {
		hooks.trigger('conn', {req:req,resp:resp});
	};

	this.bind = function(hook, cb) {
		log('Inbound', 'Binding ' + hook + ' to connection');
		callbacks[hook].push(cb);
	};

	this.start = function() {
		log('Inbound', 'Ready to receive requests');
		server.listen(_c.server.port, handleConn);
		// secureServer.listen(8000, handleConn);
	};

  	this.io = function() {
    		return io;
  	};

	this.createServer = function() {
		server = _http.createServer(handleReq);

		/*
		secureServer = _https.createServer({
			key : fs.readFileSync("/Users/ryk/Desktop/server-key.pem"),
			cert : fs.readFileSync("/Users/ryk/Desktop/server-crt.pem")
		}, handleReq);
		*/
	};

	this.getRequestHandlesCount = function() {
		return reqCount;
	};

	this.getTotalRequestHandlesCount = function() {
		return totalReqCount;
	};

	var init = function() {
	
	};

	init();
})();

module.exports = __inbound;
