const hooks = require('./hooks.js')
const log = require('./log.js')
const fs = require('fs')

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

    handleReq(req, resp) {
        require('./cachefront.js').getURL(req.url, (dat) => {
            if (dat && (!dat.expiry || dat.expiry > Date.now())) {
                resp.writeHead(200, { "Content-Type" : dat.ctype });
                resp.end(dat.html);

                return;
            }

            const ClientObject = require('./clientobject.js')
            const Handler = require('./handler.js')
            hooks.trigger('request', { req, resp });

            if (this.ready) {
                if (this.validate(req, resp)) {
                    Handler.handle(new ClientObject(req, resp));
                }
            } else {
                this.initqueue.push(new ClientObject(req, resp));
            }
        });
    }

    handleQueue() {
        this.ready = true;
        this.initqueue.forEach(cli => require("./handler.js").handle(cli));
    }

    start() {
        const _c = require('./config.js').tryDefault();
        log('Inbound', 'Ready to receive requests', 'success');

        hooks.fire("server_will_start", {server : this.server});
        this.server.listen(_c.server.port);
        hooks.fire("server_did_start",  {server : this.server});
    }

    createServer(startAfterCreation) {
        if (global.liliumenv.mode != "script" || global.liliumenv.caij) {
            log('Inbound', 'Creating HTTP server');

            const _http = require('http')
            this.server = _http.createServer((req, resp) => this.handleReq(req, resp));
            startAfterCreation && this.start();
            log('Inbound', 'Stacking requests until ready');

            this.socketio = require('socket.io')(this.server);

            if (require('./localcast').clustered) {
                const redis = require('socket.io-redis');
                this.socketio.adapter(redis());
            }

            this.server.timeout = 12 * 1000;
        } else {
            log('Inbound', 'Did not create server because of mode ' + global.liliumenv.mode);
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
