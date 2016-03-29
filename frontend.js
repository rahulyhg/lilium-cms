var log = require('./log.js');
var _c = require('./config.js');

var BodyClasses = new Object();
var JavaScriptFiles = new Object();
var CSSFiles = new Object();

var Frontend = function () {
    var bodyPrefix = "liliumbody-";
    var defaultBodySuffix = "generic";

    this.registerBodyClasses = function (className, context) {
        context = context || "all";

        var arr = BodyClasses[context];

        if (!arr) {
            arr = new Array();
            BodyClasses[context] = arr;
        }

        if (arr.indexOf(className) === -1 && (context != "all" || BodyClasses["all"].indexOf(className) !== -1)) {
            arr.push(className);
        };
    };

    this.bodyClassesContextExists = function (contextName) {
        return typeof BodyClasses[contextName] !== "undefined";
    };

    this.getBodyClasses = function (contextName) {
        var classes = BodyClasses["all"];
        if (contextName && contextName !== "all" && this.bodyClassesContextExists(contextName)) {
            classes = classes.concat(BodyClasses[contextName]);
        }

        return classes.join(" ");
    };

    this.getBodyID = function (contextName) {
        return bodyPrefix + (contextName ? contextName : defaultBodySuffix);
    };

    this.registerJSFile = function (absPath, priority, context, siteid) {
        context = context || "all";

        // TODO Handle Site ID
        var site = JavaScriptFiles[siteid];

        if (!site) {
            site = new Object();
            JavaScriptFiles[siteid] = site;
        }

        var arr = site[context];

        if (!arr) {
            arr = new Array();
            site[context] = arr;
        }

        if (arr.indexOf(absPath) === -1 && (context != "all" || site["all"].indexOf(absPath) !== -1)) {
            while (typeof arr[priority] !== 'undefined') {
                priority++;
            }

            arr[priority] = absPath;
        };
    };

    this.getJSQueue = function (contextName, siteid) {
        var arr = JavaScriptFiles[siteid][contextName || "all"];
        var returnedArr = new Array();

        if (arr)
            for (var index in arr) {
                returnedArr.push(arr[index]);
            }

        return returnedArr;
    };

    this.registerCSSFile = function (absPath, priority, context, siteid) {
        context = context || "all";

        var site = CSSFiles[siteid];

        if (!site) {
            site = new Object();
            CSSFiles[siteid] = site;
        }

        var arr = site[context];

        if (!arr) {
            arr = new Array();
            site[context] = arr;
        }

        if (arr.indexOf(absPath) === -1 && (context != "all" || site["all"].indexOf(absPath) !== -1)) {
            while (typeof arr[priority] !== 'undefined') {
                priority++;
            }

            arr[priority] = absPath;
        };
    };

    this.getCSSQueue = function (contextName, siteid) {
        var arr = CSSFiles[siteid][contextName || "all"];
        var returnedArr = new Array();

        if (arr)
            for (var index in arr) {
                returnedArr.push(arr[index]);
            }

        return returnedArr;
    };

    this.registerFromCore = function () {
        BodyClasses["all"] = ["lmlbody", "liliumbody", "dynamic"];
        BodyClasses["login"] = ["lmllogin"];
    };
};

module.exports = new Frontend();