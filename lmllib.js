var registeredLibraries = {
    config: function (context) {
        var conf = context.config || require('./config.js').default();
        return {
            default: conf
        };
    },
    frontend: function (context) {
        return require('./frontend.js');
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
    session: function () {
        return "";
    },
    plugins: function (context) {
        return require('./plugins.js');
    },
    themes: function (context) {
        return require('./themes.js');
    },
    testarray: function (context) {
        return {
            array: [{
                "text": "hello"
            }, {
                "text": " "
            }, {
                "text": "world"
            }, {
                "text": "!"
            }]
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

var LMLLib = function () {
    this.pulloutLib = function (libName, context) {
        return registeredLibraries[libName].apply(this, [context]);
    };

    this.isRegistered = function (libName) {
        return typeof registeredLibraries[libName] !== "undefined";
    };

    this.registerContextLibrary = function (libName, callback) {
        if (this.isRegistered(libName)) {
            log("Tried to add already registered LML Context Library " + libName);
        } else {
            registeredLibraries[libName] = callback;
        }
    };
};

module.exports = new LMLLib();
