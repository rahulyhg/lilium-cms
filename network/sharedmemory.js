const log = require('../log.js');
const net = require('net');

const mem = {
    roles: {},
    cache : {},
    sockets : {},
    sessions : {},
    clerk : {},
    hits : {}
}

const dumpCache = () => {
    return JSON.stringify(mem);
};

const getAllSockets = () => {
    return Object.keys(mem.sockets);
}

const setCache = (object) => {
    for (let k in object) {
        mem.cache[k] = object[k];
    }
};

const pushCache = (object) => {
    for (let k in object) {
        if (mem.cache[k]) {
            mem.cache[k].push(object[k]);
        } else {
            mem.cache[k] = [object[k]];
        }
    }
};

const unsetCache = (keys) => {
    if (typeof keys == "string") {
        keys = [keys];
    }

    for (let i = 0; i < keys.length; i++) {
        delete mem.cache[keys[i]];
    }
};

const remCache = (kv) => {
    let resp = {};

    for (let k in kv) if (mem.cache[k]) {
        let val = kv[k];
        let index = mem.cache[k].indexOf(val);

        if (index != -1) {
            mem.cache[k].splice(index, 1);
        }

        resp[k] = mem.cache[k];
    }

    return JSON.stringify(resp);
};

const getCache = keys => {
    if (typeof keys == "object") {
        let resp = {};

        for (let i = 0; i < keys.length; i++) {
            resp[keys[i]] = mem.cache[keys[i]];
        }

        return JSON.stringify(resp);
    } else {
        return mem.cache[keys];
    }
};

const updateRightsInCachedSessions = name => {
    return;

    // Neutralized until fixed
    Object.keys(mem.sessions).forEach(token => {
        const sesh = mem.sessions[token];
        if (sesh &&sesh.data.roles.includes(name)) {
            sesh.data.rights = [];
            sesh.data.roles.reduce((s, role) => {
                mem.roles[name] && s.data.rights.push(...mem.roles[role].rights);
                return s;
            }, sesh);
        };
    });
};

class SharedMemory {
    onConnect(connection) {
        let json = "";
        connection.on('data', (ck) => {
            json += ck.toString();

            if (json.charAt(json.length -1) == "\0") {
                try {
                    let object = JSON.parse(json.substring(0, json.length -1));
                    let resp = "";

                    if (object.clerk) {
                        let key = object.clerk.key;

                        if (object.clerk.action == "get") {
                            resp = JSON.stringify({session : mem.clerk[key]});
                        } else if (object.clerk.action == "set") {
                            mem.clerk[key] = object.clerk.payload;
                            resp = '{"set" : true}';
                        } else if (object.clerk.action == "unset") {
                            resp = JSON.stringify({session : mem.clerk[key]});
                            delete mem.clerk[key];
                        }
                    } else if (object.roles) {
                        let key = object.roles.role.name;
                        if (object.roles.action == "set") {
                            mem.roles[key] = object.roles.role;
                            resp = '{"set" : true}';
                        } else if (object.roles.action == "unset") {
                            resp = JSON.stringify({session : mem.roles[key]});
                            delete mem.roles[key];
                        }

                        updateRightsInCachedSessions(key);
                    } else if (object.session) {
                        let token = object.session.token;

                        if (object.session.state == "add") {
                            mem.sessions[token] = object.session.session;
                        } else if (object.session.state == "remove") {
                            delete mem.sessions[token];
                        } else if (object.session.state == "get") {
                            resp = token && mem.sessions[token] ? JSON.stringify(mem.sessions[token]) : "";
                        }
                    } else if (object.hit) {
                        let uid = object.hit.uid;
                        let url = object.hit.url;
                        let action = object.hit.action;

                        if (action == "dump") {
                            resp = JSON.stringify(mem.hits);
                        } else if (action == "set") {
                            mem.hits[uid] = url;
                            resp = "{}";
                        } else if (action == "get") {
                            resp = JSON.stringify(mem.hits[uid] || {});
                        } else if (action == "unset") {
                            delete mem.hits[uid];
                            resp = "{}";
                        } else {
                            resp = '{"error" : "Undefined action"}'
                        }
                    } else if (object.socket) {
                        let sid = object.socket.sid;
                        let uid = object.socket.uid;
                        
                        if (object.socket.state == "add") {
                            if (mem.sockets[uid]) {
                                mem.sockets[uid].push(sid);
                            } else {
                                mem.sockets[uid] = [sid];
                            }
                        } else if (object.socket.state == "remove") {
                            delete mem.hits[uid];

                            if (mem.sockets[uid]) {
                                let index = mem.sockets[uid].indexOf(sid);

                                if (index != -1) {
                                    mem.sockets[uid].splice(index, 1);
                                }

                                if (mem.sockets[uid].length == 0) {
                                    delete mem.sockets[uid];
                                }

                                resp = JSON.stringify(mem.sockets[uid] || "[]");
                            } else {
                                resp = "[]";
                            }
                        } else if (object.socket.state == "get") {
                            resp = JSON.stringify(uid ? mem.sockets[uid] : getAllSockets());
                        }
                    } else {
                        if (object.set) {
                            setCache(object.set);
                        } else if (object.unset) {
                            unsetCache(object.unset);
                        } else if (object.push) {
                            pushCache(object.push);
                        } else if (object.get) {
                            resp = JSON.stringify(getCache(object.get));
                        } else if (object.rem) {
                            resp = remCache(object.rem);
                            resp = resp ? JSON.stringify(resp) : resp;
                        } else if (object.dump) {
                            resp = dumpCache();
                        }
                    }

                    connection.end(resp);
                } catch (ex) {
                    log('SharedMem', ex + " : " + json, 'err');
                    log('SharedMem', ex.stack, 'warn');
                }
            }
        });
    }
    
    rawMemory() {
        return mem;
    }

    onError(err) {
        log('SharedMem', err, 'err');
        log('SharedMem', err.stack, 'warn');
    }

    bind() {
        this.gdconf = require('../sites/default').network;
        if (this.gdconf.useUDS) {
            log('SharedMem', "Removing old UDS file");
            try {
                require('fs').unlinkSync(__dirname + "/sharedmemory.sock");
            } catch (ex) {

            }
        }

        this.server = net.createServer(this.onConnect); 
        process.on('uncaughtException', this.onError);
        this.server.listen(!this.gdconf.useUDS ? {
            port : this.gdconf.cacheport,
            host : "localhost",
            exclusive : true
        } : {
            path : __dirname + "/sharedmemory.sock"
        }, () => {
            log("SharedMem", "Listening incoming connections", "info");
        })
    }
}

module.exports = new SharedMemory();
