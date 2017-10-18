const log = require('./log.js');

const registeredLibraries = {
    config: function (context) {
        const conf = context.config || require('./config.js').fetchConfig(context.extra.siteid);
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
            encodeURI  : function(str) { return encodeURI(str); },
            decodeURI  : function(str) { return decodeURI(str); },
            encodeXML  : function(str) { return require('entities').encodeXML (str); },
            encodeHTML : function(str) { return require('entities').encodeHTML(str); },
            decodeXML  : function(str) { return require('entities').decodeXML (str); },
            decodeHTML : function(str) { return require('entities').decodeHTML(str); } 
        };
    },
    frontend: function (context) {
        return require('./frontend.js');
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
        const conf = context.config || require('./config.js').fetchConfig(context.extra.siteid);
        return require('./vocab.js').getDico(conf.website.language);
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
                const sl = require('slugify')(str ? str.toString() : "");
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
                log('LML', 'Debug : ');
                console.log(JSON.stringify(context));
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
