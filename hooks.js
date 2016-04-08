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
    this.bind = this.register = function (eventName, priority, callback) {
        var registerFilename = getCallerFileName();
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
        if (typeof events[eventName] !== 'undefined') {

            var keys = Object.keys(events[eventName]);
            for (var i = keys.length - 1; i >= 0; i--) {
                if (events[eventName][keys[i]].cb(
                        typeof params === 'undefined' ? undefined : params,
                        eventName
                    )) {
                    break;
                }
            }
        }
    };

    this.bindPluginDisabling = function () {
        this.bind('plugindisabled', 1, function (identifier) {
            for (var i in events) {
                for (var j in events[i]) {
                    if (events[i][j].plugin == identifier) {
                        delete events[i][j];
                    }
                }
            }
        });
    }

    var getCallerFileName = function () {
        try {
            var err = new Error();
            var callerfile;
            var currentfile;

            Error.prepareStackTrace = function (err, stack) {
                return stack;
            };

            currentfile = err.stack.shift().getFileName();

            while (err.stack.length) {
                callerfile = err.stack.shift().getFileName();

                if (currentfile !== callerfile) return callerfile;
            }
        } catch (err) {}
        return undefined;
    }
};
module.exports = new Hooks();
