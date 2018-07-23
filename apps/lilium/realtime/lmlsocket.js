import io from 'socket.io-client';
let SOCKET_EVENTS = {};

export class LMLSocket {
    static createConnectionString() {
        return liliumcms.url + "/" + liliumcms.uid
    }

    static generateEventID() {
        return "ev" + Date.now().toString() + Math.random().toString();
    }

    connect() {
        log('LMLSocket', 'Creating realtime socket connection at ' + LMLSocket.createConnectionString(), 'socket');
        this.socket = io(LMLSocket.createConnectionString(), {
            transports : ['websocket']
        });
    }

    bind(ev, callback) {
        log('LMLSocket', 'Binding a realtime event : ' + ev, 'socket');
        if (!SOCKET_EVENTS[ev]) {        
            SOCKET_EVENTS[ev] = [];
            this.socket.on(ev, data => {
                SOCKET_EVENTS[ev].forEach(entry => {
                    entry.callback(data);
                })
            });
        }

        const id = LMLSocket.generateEventID();
        SOCKET_EVENTS[ev].push({
            id, callback
        });

        log('LMLSocket', 'Bound a realtime event with id : ' + id, 'socket');
        return id;
    }

    unbind(ev, evid) {
        log('LMLSocket', 'Unbinding a realtime event with id : ' + id, 'socket');
        const entryIndex = SOCKET_EVENTS[ev].findIndex(x => x.id == evid);
        if (entryIndex != -1) {
            SOCKET_EVENTS.splice(entryIndex, 1);
        }       
        
        log('LMLSocket', 'Unbound a realtime event with id : ' + id, 'socket');
    }
}
