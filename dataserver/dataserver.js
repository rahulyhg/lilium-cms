const fs = require('fs');
const path = require('path');
const http = require('http');
const ClientObject = require('./clientobject');
const Database = require('./database');
const Handlers = require('./handlers')
const configs = {};

class DataServer {
    start() {
        const dirpath = path.join(liliumroot, 'sites')
        const files = fs.readdirSync(dirpath);
        
        files.forEach(f => {
            const _c = require(path.join(dirpath, f));
            if (_c.dataserver && _c.dataserver.active) {
                configs[_c.dataserver.port] = _c;
                this.createServer(_c);
            }
        });
    }

    handle(cli) {
        Handlers.handle(cli);
    }

    createServer(_c) {
        const s = http.createServer((req, resp) => {
            const _c = configs[req.socket.localPort];
            if (_c) {
                this.handle(new ClientObject(_c, req, resp));
            } else {
                resp.end();
            }
        });

        configs[_c.dataserver.port]._httpserver = s;

        Database.init(_c, db => {
            s.listen(_c.dataserver.port, () => { });

            Handlers.preload(db);
        });
    }
}

const server = new DataServer();
server.start();