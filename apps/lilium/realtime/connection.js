import io from 'socket.io-client';

let LMLSOCKET;
let SOCKET_EVENTS = {};

class LMLSocket {
    static createConnectionString() {
        return liliumcms.url + "/" + liliumcms.uid
    }

    static generateEventID() {
        return "ev" + Date.now().toString() + Math.random().toString();
    }

    constructor() {
        console.log(LMLSocket.createConnectionString());
        this.socket = io(LMLSocket.createConnectionString(), {
            transports : ['websocket']
        });
    }

    bind(ev) {
        this.socket.on(ev, data => {
            SOCKET_EVENTS[ev].forEach(entry => {
                entry.callback(data);
            })
        });
    }

    unbind(ev, evid) {
        const entryIndex = SOCKET_EVENTS[ev].findIndex(x => x.id == evid);
        if (entryIndex != -1) {
            SOCKET_EVENTS.splice(entryIndex, 1);
        }
    }
}

export function initiateConnection() {
    LMLSOCKET = new LMLSocket();
}

export function bindRealtimeEvent(ev, callback) {
    if (!SOCKET_EVENTS[ev]) {
        SOCKET_EVENTS[ev] = [];
        LMLSOCKET.bind(ev);
    }

    let id = LMLSocket.generateEventID();
    SOCKET_EVENTS[ev].push({
        id, callback
    });
}

export function unbindRealtimeEvent(ev, evid) {
    LMLSOCKET.unbind(ev, evid);
}