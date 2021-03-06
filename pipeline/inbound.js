const hooks = require('../lib/hooks')

const fs = require('fs')
const metrics = require('../lib/metrics');

class Inbound {
    constructor() {
        this.ready = false;
        this.initqueue = [];

        this.server;
        this.secureServer;
        this.socketio;
    }

    validate(req, resp) {
        if (req.url.split('/').length > 2 && req.url.charAt(req.url.length-1) == "/") {
            var newurl = req.url.slice(0, -1);
            log('Inbound', "Removing trailing from " + req.url, 'detail');
            resp.writeHead(301, {Location : newurl})
            resp.end();
            return false;
        }

        return true; 
    }

    handleTestReq(req, resp) {
        this.handleReq(req, resp);
    }

    handleReq(req, resp) {
        metrics.plus('requests');
        metrics.plus('requestspers');
        require('../lib/cachefront.js').getURL(req.url, (dat) => {
            if (dat && (!dat.expiry || dat.expiry > Date.now())) {
                resp.writeHead(dat.status || 200, dat.headers || { "Content-Type" : dat.ctype });
                dat.data ? resp.end(dat.data) : resp.end();

                return false;
            }

            const ClientObject = require('./clientobject.js')
            const Handler = require('./handler.js')
            hooks.trigger('request', { req, resp });

            if (this.ready) {
                this.validate(req, resp) && Handler.handle(new ClientObject(req, resp));
            } else {
                this.initqueue.push(new ClientObject(req, resp));
            }
        });
    }

    handleQueue() {
        this.ready = true;
        this.initqueue.forEach(cli => this.validate(cli.request, cli.response) && require("./handler.js").handle(cli));

        // Get rid of references to Client objects
        this.initqueue = [];
    }

    start() {
        const _c = require('../lib/config').tryDefault();
        log('Inbound', 'Ready to receive requests', 'success');

        hooks.fire("server_will_start", {server : this.server});
        this.server.listen(_c.server.port);
        hooks.fire("server_did_start",  {server : this.server});
    }

    createServer(startAfterCreation) {
        if (global.liliumenv.mode != "script" && !process.env.job) {
            log('Inbound', 'Creating HTTP server');

            const _http = require('http')
            if (global.__TEST) {
                this.server = _http.createServer((req, resp) => this.handleTestReq(req, resp));
            } else {
                this.server = _http.createServer((req, resp) => this.handleReq(req, resp));
            }

            startAfterCreation && this.start();
            log('Inbound', 'Stacking requests until ready');

            this.socketio = require('socket.io')(this.server);

            if (require('../network/localcast').clustered) {
                const redis = require('socket.io-redis');
                this.socketio.adapter(redis());
            }

            this.server.timeout = 12 * 1000;
        } else {
            log('Inbound', 'Did not create server because of mode or job ' + (global.liliumenv.mode || process.env.job));
        }

        return this;
    }

    io() {
        return this.socketio;
    }

    getServer() {
        return this.server;
    };
}

const __inbound = new Inbound();
module.exports = __inbound;
