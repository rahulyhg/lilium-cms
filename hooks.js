const log = require('./log.js');
const _c = require('./config.js');
const pluginHelper = require('./pluginHelper.js');
const isElder = require('./network/info.js').isElderChild();

const events = {
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
    "endpoints": {},
    "plugindisabled": {}
};

class Hooks {
    init() {
        if (!isElder) {return}

        // Time-based hooks
        let timeTillNextHour = (1000 * 60 * 60) - Date.now() % (1000 * 60 * 60);
        let timeTillNext24h  = (1000 * 60 * 60 * 24) - Date.now() % (1000 * 60 * 60 * 24);

        const createHourHook = () => {
            setTimeout(() => {
                this.fire('time_is_hour');
                timeTillNextHour = 1000 * 60 * 60;
                createMidnightHook();
            }, timeTillNextHour);
        };

        const createMidnightHook = () => {
            setTimeout(() => {
                this.fire('time_is_midnight');
                timeTillNext24h = 1000 * 60 * 60 * 24;
                createMidnightHook();
            }, timeTillNext24h);
        }

        createHourHook();
        createMidnightHook();
    }

    getHooksFor(eventName) {
        return events[eventName] || {};
    }

    register() {return this.bind(...arguments);}
    bind(eventName, priority, callback, registerFilename) {
        registerFilename = registerFilename || __caller;

        if (typeof eventName == "object") {
            for (let i = 0; i < eventName.length; i++) {
                this.bind(eventName[i], priority, callback, registerFilename);
            }
            return;
        }

        pluginHelper.getPluginIdentifierFromFilename(registerFilename, function (pluginIdentifier) {
            if (typeof events[eventName] === 'undefined') {
                events[eventName] = {};
            }

            //add to Object
            let switchedPrio = false;
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

            events[eventName][priority] = {
                cb: callback,
                plugin: pluginIdentifier
            };

            //Sort object based on priority
            let keys = Object.keys(events[eventName]);
            let len = keys.length;
            keys.sort();
            let tempObj = {};
            for (let i = 0; i < len; i++) {
                tempObj[keys[i]] = events[eventName][keys[i]];
            }
            events[eventName] = tempObj;
        });

    };

    fire() {this.trigger(...arguments)}
    trigger(eventName, params) {
        if (events[eventName]) {
            let keys = Object.keys(events[eventName]);
            params = params || {};
            params.eventName = eventName;

            for (let i = keys.length - 1; i >= 0; i--) {
                if (events[eventName][keys[i]].cb(
                        params,
                        eventName
                    )) {
                    break;
                }
            }
        }
    };

    bindPluginDisabling() {
        this.bind('plugindisabled', 9999, function (identifier) {
            for (let i in events) {
                for (let j in events[i]) {
                    if (events[i][j].plugin == identifier) {
                        delete events[i][j];
                    }
                }
            }
        });
    }
};

module.exports = new Hooks();
