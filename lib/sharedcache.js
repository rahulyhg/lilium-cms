const net = require('net');
const gdinfo = require('../network/info.js');
const gdconf = require('../sites/default').network;
const sockpath = require('../network/sharedmemory').getSockPath();
const noop = () => {};

class SockFallback {
    on(ev, cb) {
        if (ev == "end") { cb && cb(); }
    }

    write(dat) { }
}

const getUDS = () => {
    const conn = net.connect(gdconf.useUDS ? {
        path : sockpath
    } : {
        port : gdconf.cacheport,
        host : "localhost"
    });

    conn.on('error', err => {
        log('SharedCache', 'Could not connect to shared memory server', 'err');
        const error = new Error(err.toString());
        require('../network/localcast').fatal(error);
    });

    return conn;
}

class SharedCache {
    livevar(cli, levels, params, send) {
        if (!cli.hasRight('admin')) {
            return send([]);
        }

        switch (levels[0]) {
            case "dump":
                let sock = getUDS();
                let dat = "";
                sock.on('end', () => {
                    send(JSON.parse(dat));
                });
                sock.on('data', (c) => {
                    dat += c.toString();
                });
                sock.write(JSON.stringify({
                    dump : true
                }) + "\0");
                break;
            default:
                send([]);
        }
    }

    unset(key, done) {
        let sock = getUDS();
        sock.on('end', done || noop);
        sock.write(JSON.stringify({
            unset : key
        }) + "\0");
    }

    set(object, done) {
        let sock = getUDS();
        sock.on('end', done || noop);
        sock.write(JSON.stringify({
            set : object
        }) + "\0");
    }

    push(object, done) {
        let sock = getUDS();
        sock.on('end', done || noop);
        sock.write(JSON.stringify({
            push : object
        }) + "\0");
    }

    rem(object, done) {
        let sock = getUDS();
        sock.on('end', done || noop);
        sock.write(JSON.stringify({
            rem : object
        }) + "\0");
    }

    get(key, done) {
        let sock = getUDS();
        let json = "";
        sock.on('data', (c) => {
            json += c;
        }); 

        sock.on('end', () => {
            done && done(json && JSON.parse(json));
        });

        sock.write(JSON.stringify({
            get : key
        }) + "\0");
    }

    getSocketID(uid, done) {
        this.socket(uid, 'get', false, done);
    }

    setRole(role, done) {
        let sock = getUDS();
        sock.on('end', done || noop);
        sock.write(JSON.stringify({
            roles: {
                action: 'set',
                role
            }
        }) + "\0");
    }

    socket(uid, state, sid, done) {
        let sock = getUDS();
        let json = "";
        sock.on('data', (c) => {
            json += c;
        }); 

        sock.on('end', () => {
            done && done(json && JSON.parse(json));
        });

        sock.write(JSON.stringify({
            socket : {
                uid, sid, state
            }
        }) + "\0");
    }

    getSession(token, done) {
        this.session(token, 'get', false, done);
    }

    session(token, state, session, done) {
        let sock = getUDS();
        let json = "";
        sock.on('data', (c) => {
            json += c;
        }); 

        sock.on('end', () => {
            done && done(json && JSON.parse(json));
        });

        sock.write(JSON.stringify({
            session : {
                token, session, state
            }
        }) + "\0");
    }

    hit(action, uid, url, send) {
        const sock = getUDS();
        let response = "";
        sock.on('data', (c) => {
            response += c;
        });

        sock.on('end', () => {
            send && send(response && JSON.parse(response));
        });

        sock.write(JSON.stringify({
            hit : {
                action, uid, url
            }
        }) + "\0");
    }

    hi() {
        let helloObject = {};
        helloObject["HelloFrom" + gdinfo.instanceNumber()] = "Hello ! I am instance number " + gdinfo.instanceNumber();
        this.set(helloObject, () => {
            log('SharedCache', "Said hello to Shared Memory module from instance " + gdinfo.instanceNumber());
        });
    }
}

module.exports = new SharedCache();
