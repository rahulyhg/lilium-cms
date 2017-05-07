var _c = require('./config.js').default(),
    _http = require('http'),
    _https = require('https'),
    hooks = require('./hooks.js'),
    log = require('./log.js'),
    ClientObject = require('./clientobject.js'),
    Handler = require('./handler.js'),
    fs = require('fs'),
    reqCount = 0,
    totalReqCount = 0,
    __inbound = new(function () {
        var server;
        var secureServer;
        var io;

        var validate = function(req, resp) {
            if (req.url.split('/').length > 2 && req.url.charAt(req.url.length-1) == "/") {
                var newurl = req.url.slice(0, -1);
                log('Inbound', "Removing trailing from " + req.url, 'detail');
                resp.writeHead(301, {Location : newurl})
                resp.end();
                return false;
            }

            return true; 
        };

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

            if (validate(req, resp)) {
                Handler.handle(new ClientObject(req, resp));
            }
        };

        this.bind = function (hook, cb) {
            log('Inbound', 'Binding ' + hook + ' to connection', 'info');
            callbacks[hook].push(cb);
        };

        this.start = function () {
            if (global.liliumenv.mode != "script" && process.env.mode != "script") {
                log('Inbound', 'Ready to receive requests', 'success');
                _c = require('./config.js').default();

                hooks.fire("server_will_start", {server : server});
                server.listen(_c.server.port);
                hooks.fire("server_did_start",  {server : server});
            }
        };

        this.io = function () {
            return io;
        };

        this.createServer = function () {
            if (global.liliumenv.mode != "script") {
                server = _http.createServer(handleReq);
                io = require('socket.io')(server);

                if (require('./localcast').clustered) {
                    redis = require('socket.io-redis');
                    io.adapter(redis());
                }
            }

            return this;
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
