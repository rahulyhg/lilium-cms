import { LMLSocket } from './lmlsocket';

const LMLSOCKET = new LMLSocket();;

export function initiateConnection() {
    LMLSOCKET.connect();
}

export function bindRealtimeEvent(ev, callback) {
    return LMLSOCKET.bind(ev, callback);
}

export function unbindRealtimeEvent(ev, evid) {
    LMLSOCKET.unbind(ev, evid);
}