import { LMLSocket } from './lmlsocket';
let LMLSOCKET;

export function initiateConnection() {
    if (!LMLSOCKET) {
        LMLSOCKET = new LMLSocket();
        LMLSOCKET.connect();
    }
}

export function bindRealtimeEvent(ev, callback) {
    return LMLSOCKET.bind(ev, callback);
}

export function unbindRealtimeEvent(ev, evid) {
    LMLSOCKET.unbind(ev, evid);
}