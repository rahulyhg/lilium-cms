var log = require('./log.js');

var registeredLibraries = {
    config: function (context) {
        var conf = context.config || require('./config.js').fetchConfig(context.extra.siteid);
        return {
            default: conf
        };
    },
    output : function(context) {
        return function(str) {
            context.writeToBuffer(str);
        };
    },
    badges : function(context) {
        var conf = context.config || require('./config.js').fetchConfig(context.extra.siteid);
        return {
            userbadges : require('./badges.js').listUserBadges(conf)
        };
    },
    frontend: function (context) {
        return require('./frontend.js');
    },
    json: function(context) {
        return JSON;
    },
    vocab: function (context) {
        return require('./vocab.js');
    },
    forms: function (context) {
        return require('./formBuilder.js');
    },
    article: function (context) {
        return require('./article.js');
    },
    plugins: function (context) {
        return require('./plugins.js');
    },
    themes: function (context) {
        return require('./themes.js');
    },
    slug : function(context) {
        return {
            ify : function(str) {
                var sl = require('slugify')(str);
                return sl ? sl.toLowerCase() : "";
            }
        };
    },
    postleaf : function(context) {
        return {
            all : function() { return require('./postleaf.js').getLeaves(); }
        }
    },
    extra: function (context) {
        return context.extra;
    },
    debug: function (context) {
        return {
            printcontext: function () {
                return JSON.stringify(context);
            },
            format: "json"
        };
    }
};

var LMLLib = function () {
    this.pulloutLib = function (libName, context) {
        return registeredLibraries[libName].apply(context, [context]);
    };

    this.isRegistered = function (libName) {
        return typeof registeredLibraries[libName] !== "undefined";
    };

    this.registerContextLibrary = function (libName, callback) {
        if (this.isRegistered(libName)) {
            require('./log.js')("Tried to add already registered LML Context Library " + libName);
        } else {
            registeredLibraries[libName] = callback;
        }
    };
};

module.exports = new LMLLib();
