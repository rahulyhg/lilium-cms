/**
 * This file adds globally available functions to the window.liliumcms object.
 * Those functions can be used to bind on synthetic event to override the default browser behavior
 */

 /**
  * Object keyed by event name to associate a single callback to a native event
  */
const nativeEventsMap = {};

/**
 * An object keyed by synthetic event name that holds an array of callbacks to execute
 */
const syntheticEventsMap = {};

const bindNativeEvent = eventName => {
    if (!Object.keys(nativeEventsMap).includes(eventName)) {
        nativeEventsMap[eventName] = handleNativeEvent;
        document.addEventListener(eventName, handleNativeEvent);
    }

    console.log('Native events', nativeEventsMap);
};

/**
 * Handles the event for ALL types of native events and executes the callbacks that are subscribed
 * to the corresponding synthetic event
 * @param {object} e Event object
 */
const handleNativeEvent = e => {
    if (syntheticEventsMap[e.type] && syntheticEventsMap[e.type].length) {
        for (let i = 0; i < syntheticEventsMap[e.type].length; i++) {
            const cb = syntheticEventsMap[e.type][i];
            const rvalue = cb(e);
            if (rvalue === false) {
                break;
            }
        }
    }
};

export const bindFirst = (eventName, handler) => {
    if (!syntheticEventsMap[eventName]) syntheticEventsMap[eventName] = [];
    
    syntheticEventsMap[eventName].unshift(handler);
    bindNativeEvent(eventName);
};

export const bind = (eventName, handler) => {
    if (!syntheticEventsMap[eventName]) syntheticEventsMap[eventName] = [];
    
    syntheticEventsMap[eventName].push(handler);
    bindNativeEvent(eventName);
};

export const unbind = (eventName, handler) => {
    if (syntheticEventsMap[eventName]) {
        const i = syntheticEventsMap[eventName].findIndex(h => h == handler);        
        if (i >= 0) {
            syntheticEventsMap[eventName].splice(i, 1);
        }
    }
}

