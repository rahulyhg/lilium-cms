
var lmllib = require('./lmllib.js');
const filelogic = require('./pipeline/filelogic');

// LML Context Object Namespace
// Those will be loaded runtime instead of on boot
var LMLConstants = {
    "false": false,
    "true": true,
    "null" : null,
    "undefined" : undefined
}

var LMLContext = function (info) {
    this.touched = ["LMLContext.init"];
    this.lib = {
        _public: new Object()
    };
    this.extra = new Object();
    this.slangContext = new Object();

    this.loadLibrary = function (libName) {
        if (!lmllib.isRegistered(libName)) {
            log("LMLParseException", "Unable to add unregistered library '" + libName + "' to current context", 'warn');
            return;
        }

        if (typeof this.lib[libName] !== "undefined") {
            // log("LMLParseWarning", "Attempted to add already registered library '"+libName+"' to context");
            return;
        }

        this.lib[libName] = lmllib.pulloutLib(libName, this);
    };

    this.states = [];
    this.stash = function () {
        this.states.push({
            tagProspect: this.tagProspect,
            isInTag: this.isInTag,
            isExecTag: this.isExecTag,
            isLMLTag: this.isLMLTag,
            storeBuffer: this.storeBuffer,
            currentInTag: this.currentInTag,
            cachedCommand: this.cachedCommand,
            newLine: this.newLine,
            skipNextChar: this.skipNextChar,
            rootDir: this.rootDir,
            rootPath: this.rootPath,
            avoidParent: this.avoidParent,
            lmlBlockThread: this.lmlBlockThread,
            currentLineIndex: this.currentLineIndex,
            condStack: this.condStack,
            currentBlock: this.currentBlock,
            skipUntilClosure: this.skipUntilClosure,
            storeUntilClosure: this.storeUntilClosure,
            temp: this.temp
        });

        this.init();
    };

    this.merge = function () {
        if (this.states.length != 0) {
            var poped = this.states.pop();

            for (var k in poped) {
                this[k] = poped[k];
            };
        }
    };

    this.touch = function (str) {
        this.touched.push(str);
    };

    this.lineFeedback = new Object();
    this.init = function (info) {
        this.tagProspect = false;
        this.isInTag = false;
        this.isExecTag = false;
        this.isLMLTag = false;

        this.currentInTag = '';
        this.cachedCommand = '';
        this.storeBuffer = '';
        this.skipNextChar = false;
        this.rootDir = '';
        this.rootPath = '';
        this.avoidParent = false;
        this.lmlBlockThread = false;
        this.currentLineIndex = 0;

        // Contains : {condTag:"if|while|for", values:[val1, val2], operator:"==|<=|>=|!="}
        this.condStack = [];
        this.currentBlock = "lml";
        this.skipUntilClosure = false;
        this.storeUntilClosure = false;

        // Carried between stashes
        this.compiled = '';
        this.newLine = '';
        this.finished = false;

        this.outputstream;
        this.linesToWrite = 0;
        this.linesWritten = 0;
        this.readyToClose = false;

        this.temp = new Object();
    };

    this.init();
};

LMLContext.prototype.setStream = function(s) {
    this.outputstream = s;
};

LMLContext.prototype.bindFinished = function(cb) {
    this.finishedCallback = cb;
    this.lineWritten(true);
}

LMLContext.prototype.flagEnd = function() {
    this.readyToClose = true;
    this.lineWritten(true);
}

LMLContext.prototype.write = LMLContext.prototype.w = function(str) {
    this.linesToWrite++;

    if (str && str.length !== 0) {
        var that = this;
        filelogic.writeToFile(this.outputstream, str.toString(), function() {that.lineWritten(false)}, 'utf8');
    } else {
        this.lineWritten(false);
    }
};

LMLContext.prototype.lineWritten = function(skip) {
    if (!skip) {
        this.linesWritten++;
    }

    if (this.readyToClose && this.linesToWrite == this.linesWritten) {
        this.finished = true;
        this.finishedCallback && this.finishedCallback();
    } 
};

module.exports = LMLContext;
