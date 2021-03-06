const registeredLibraries = {
    config: function (context) {
        const conf = context.config || require('./lib/config').fetchConfig(context.extra.siteid);
        return {
            default: conf
        };
    },
    output : function(context) {
        return function(str) {
            context.writeToBuffer(str);
        };
    },
    encodec : function(context) {
        const entities = require('entities');
        return {
            encodeURI  : function(str = "") { return encodeURI(str.toString()); },
            decodeURI  : function(str = "") { return decodeURI(str.toString()); },
            encodeXML  : function(str = "") { return require('entities').encodeXML (str.toString()); },
            encodeHTML : function(str = "") { return require('entities').encodeHTML(str.toString()); },
            decodeXML  : function(str = "") { return require('entities').decodeXML (str.toString()); },
            decodeHTML : function(str = "") { return require('entities').decodeHTML(str.toString()); } 
        };
    },
    json: function(context) {
        return JSON;
    },
    date: function(context) {
        return {
            stringify : function(str, format) {
                const formats = {
                    short : "mmm dd, yyyy",
                    full : "mmmm dd, yyyy",
                    slash : "dd/mm/yyyy",
                    timeondate : "hh:mm:ss 'on' mmmm, dd 'year' yyyy"
                };
                try {
                    return require('dateformat')(str, format ? formats[format] || formats.full : formats.full);
                } catch (ex) {
                    return str;
                }
            },
            now : function() {
                return new Date();
            }
        };
    },
    vocab: function (context) {
        const conf = context.config || require('./lib/config').fetchConfig(context.extra.siteid);
        return require('./vocab.js').getDico(conf.website.language);
    },
    article: function (context) {
        return require('./content.js');
    },
    plugins: function (context) {
        return require('./plugins.js');
    },
    themes: function (context) {
        return require('./lib/themes.js');
    },
    theme : function (context) {
        return require('./lib/themes.js').getEnabledTheme(context.config);
    },
    slug : function(context) {
        return {
            ify : function(str) {
                const sl = require('slugify')(str ? str.toString() : "");
                return sl ? sl.toLowerCase() : "";
            }
        };
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

class LMLLib {
    pulloutLib(libName, context) {
        return registeredLibraries[libName].apply(context, [context]);
    };

    isRegistered(libName) {
        return typeof registeredLibraries[libName] !== "undefined";
    };

    registerContextLibrary(libName, callback) {
        if (this.isRegistered(libName)) {
            require('./log.js')("Tried to add already registered LML Context Library " + libName);
        } else {
            registeredLibraries[libName] = callback;
        }
    };
};

module.exports = new LMLLib();
