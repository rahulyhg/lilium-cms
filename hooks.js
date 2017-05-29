var log = require('./log.js');
var _c = require('./config.js');
var pluginHelper = require('./pluginHelper.js');

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
    "endpoints": {},
    "plugindisabled": {}
};


var Hooks = function () {
    this.getHooksFor = function(eventName) {
        return events[eventName] || {};
    }

    this.bind = this.register = function (eventName, priority, callback, registerFilename) {
        var registerFilename = registerFilename || __caller;

        if (typeof eventName == "object") {
            for (var i = 0; i < eventName.length; i++) {
                this.bind(eventName[i], priority, callback, registerFilename);
            }
            return;
        }
        pluginHelper.getPluginIdentifierFromFilename(registerFilename, function (pluginIdentifier) {

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

            events[eventName][priority] = {
                cb: callback,
                plugin: pluginIdentifier
            };

            //Sort object based on priority
            var keys = Object.keys(events[eventName]);
            var len = keys.length;
            keys.sort();
            var tempObj = {};
            for (var i = 0; i < len; i++) {
                tempObj[keys[i]] = events[eventName][keys[i]];
            }
            events[eventName] = tempObj;
        });

    };

    this.trigger = this.fire = function (eventName, params) {
        if (events[eventName]) {
            var keys = Object.keys(events[eventName]);
            params = params || {};
            params.eventName = eventName;

            for (var i = keys.length - 1; i >= 0; i--) {
                if (events[eventName][keys[i]].cb(
                        params,
                        eventName
                    )) {
                    break;
                }
            }
        }
    };

    this.bindPluginDisabling = function () {
        this.bind('plugindisabled', 9999, function (identifier) {
            for (var i in events) {
                for (var j in events[i]) {
                    if (events[i][j].plugin == identifier) {
                        delete events[i][j];
                    }
                }
            }
        });
    }
};
module.exports = new Hooks();
