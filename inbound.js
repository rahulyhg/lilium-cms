var _c = require('./config.js').default(),
    _http = require('http'),
    _https = require('https'),
    hooks = require('./hooks.js'),
    log = require('./log.js'),
    fs = require('fs'),
    reqCount = 0,
    totalReqCount = 0,
    __inbound = new(function () {
        var server;
        var secureServer;
        var io;

        var handleReq = function (req, resp) {
            reqCount++;
            totalReqCount++;
            resp.on('finish', function () {
                reqCount--;
            });

            hooks.trigger('request', {
                req: req,
                resp: resp
            });
        };

        var handleConn = function (req, resp) {
            hooks.trigger('conn', {
                req: req,
                resp: resp
            });
        };

        this.bind = function (hook, cb) {
            log('Inbound', 'Binding ' + hook + ' to connection', 'info');
            callbacks[hook].push(cb);
        };

        this.start = function () {
            log('Inbound', 'Ready to receive requests', 'success');
            _c = require('./config.js').default();

            hooks.fire("server_will_start", {server : server});
            server.listen(_c.server.port, handleConn);
            hooks.fire("server_did_start",  {server : server});
            // secureServer.listen(8000, handleConn);
        };

        this.io = function () {
            return io;
        };

        this.createServer = function () {
            server = _http.createServer(handleReq);
            io = require('socket.io')(server);

            if (require('./localcast').clustered) {
                redis = require('socket.io-redis');
                io.adapter(redis());
            }
            /*
            secureServer = _https.createServer({
            	key : fs.readFileSync("/Users/ryk/Desktop/server-key.pem"),
            	cert : fs.readFileSync("/Users/ryk/Desktop/server-crt.pem")
            }, handleReq);
            */
        };

        this.getServer = function() {
            return server;
        };

        this.getRequestHandlesCount = function () {
            return reqCount;
        };

        this.getTotalRequestHandlesCount = function () {
            return totalReqCount;
        };

        var init = function () {

        };

        init();
    })();

module.exports = __inbound;
