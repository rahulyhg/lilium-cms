const LILIUM_EVENTS = [];

export function listenToEvent(ev, callback) {
    LILIUM_EVENTS[ev] = LILIUM_EVENTS[ev] || [];
    LILIUM_EVENTS[ev].push(callback);
}

export function fireEvent(ev, payload) {
    LILIUM_EVENTS[ev] && LILIUM_EVENTS[ev].forEach(cb => cb(payload));
}
