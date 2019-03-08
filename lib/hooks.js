const _c = require('./config');
const isElder = require('../network/info.js').isElderChild();

const events = {};
const siteevents = {};

class Hooks {
    init() {
        if (!isElder) {return}

        // Time-based hooks
        let timeTillNextHour = (1000 * 60 * 60) - Date.now() % (1000 * 60 * 60);

        const createHourHook = () => {
            setTimeout(() => {
                log('Hooks', 'Dispatching hourly event for hour : ' + new Date().getHours());

                this.fire('time_is_hour');
                new Date().getHours() == 0 && this.fire('time_is_midnight');

                timeTillNextHour = 1000 * 60 * 60;
                createHourHook();
            }, timeTillNextHour);
        };

        createHourHook();
    }

    getHooksFor(eventName) {
        return events[eventName] || [];
    }

    getSiteHooksFor(_c, name) {
        return siteevents[_c.id] ? siteevents[_c.id][name] : [];
    }

    debug() {
        return {
            globalevents : events,
            siteevents : siteevents
        };
    }

    register() {return this.bind(...arguments);}
    bind(eventName, priority, callback) {
        if (typeof eventName == "object") {
            for (let i = 0; i < eventName.length; i++) {
                this.bind(eventName[i], priority, callback);
            }
            return;
        }

        if (!events[eventName]) {
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
            cb: callback
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
    };

    bindSite(_c, name, cb) {
        siteevents[_c.id] = siteevents[_c.id] || {};
        siteevents[_c.id][name] = siteevents[_c.id][name] || [];
        siteevents[_c.id][name].push(cb);
    }

    fireSite(_c, name, payload = {}) {
        siteevents[_c.id] && siteevents[_c.id][name] && siteevents[_c.id][name].forEach(ftc => ftc && ftc(payload, _c));
        this.fire(name, payload);
    }

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
};

module.exports = new Hooks();
