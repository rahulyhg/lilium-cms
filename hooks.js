var log = require('./log.js');

var events = {
    "load": {},
    "request": {},
    "clientobject": {},
    "dispatch": {},
    "redirect": {},
    "postdata": {},
    "login": {},
    "logout": {},
    "lmlstart": {},
    "lmlinclude": {},
    "endpoints": {}
};

var Hooks = function () {
    this.bind = this.register = function (eventName, priority, callback) {
        if (typeof events[eventName] === 'undefined') {
            events[eventName] = {};
        }

        //add to Object
        var switchedPrio = false;
        if (events[eventName][priority]) {
            log("Hooks", "Tried to bind on event with existing priority : " + eventName + "@" + priority);
            switchedPrio = true;
        }

        while (events[eventName][priority]) {
            priority++;
        }
        
        if (switchedPrio) {
            log("Hooks", "Modified priority to " + priority);
        }

        events[eventName][priority] = callback;

        //Sort object based on priority
        var keys = Object.keys(events[eventName]);
        var len = keys.length;
        keys.sort();
        var tempObj = {};
        for (var i = 0; i < len; i++) {
            tempObj[keys[i]] = events[eventName][keys[i]];
        }
        events[eventName] = tempObj;
    };

    this.trigger = this.fire = function (eventName, params) {
        if (typeof events[eventName] !== 'undefined') {
            var keys = Object.keys(events[eventName]);
            for (var i = keys.length - 1; i >= 0; i--) {
                if (events[eventName][keys[i]](
                        typeof params === 'undefined' ? undefined : params,
                        eventName
                    )) {
                    break;
                }
            }
        }
    };
};

module.exports = new Hooks();
