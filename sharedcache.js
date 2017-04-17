const log = require('./log.js');
const net = require('net');
const gdconf = require('./network/gardener.json');
const gdinfo = require('./network/info.js');
const noop = () => {};

const getUDS = () => {
    return net.connect({
        path : __dirname + "/network/sharedmemory.sock"
    });
}

class SharedCache {
    livevar(cli, levels, params, send) {
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
                uid : uid,
                sid : sid, 
                state : state
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
                token : token, 
                session : session, 
                state : state
            }
        }) + "\0");
    }

    hi() {
        let helloObject = {};
        helloObject["HelloFrom" + gdinfo.instanceNumber()] = "hello";
        this.set(helloObject, () => {
            log('SharedCache', "Said hello to Shared Memory module");
        });
    }
}

module.exports = new SharedCache();
