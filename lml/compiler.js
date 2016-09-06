// Lilium Markup language
// v1.3 Gaia
var log = require('../log.js');
var lmllib = require('../lmllib.js');
var configs = require('../config.js');

var opetators = ["+", "-", "*", "/", "=", "+=", "-=", "*=", "/="];
var comparators = ["==", "!="];
var delimiters = ["=", "$", "%", "#", "*"];
var stackRegex = /([\+\-\*\/\,\.\(\)])/;
var opener = "{";
var noOp = function() {};
var LMLCompiler = function() {};

var stacks = [];

var LMLContext = function() {}
    LMLContext.prototype.outstream;
    LMLContext.prototype.siteConfig;
    LMLContext.prototype.text = "";
    LMLContext.prototype.cursor = 0;
    LMLContext.prototype.stack = [];
    LMLContext.prototype.initialized = false;
    LMLContext.prototype.buffer = [];
    LMLContext.prototype.writing = false;
    LMLContext.prototype.done = false;
    LMLContext.prototype.endHook = noOp;
    LMLContext.prototype.lib;
    
LMLContext.prototype.writeToBuffer = function(cTxt) {
    if (typeof end === "number") {
        cTxt = context.text.substring(end - this.cursor, this.cursor);
    }
    this.buffer.push(cTxt);

    if (!this.writing) {
        this.writing = true;

        var nxt = function() {
            this.outstream.write(this.buffer.shift(), 'utf8', function() {
                if (this.done && this.buffer.length == 0) {
                    this.outstream.end('', 'utf8', this.endHook);
                } else if (this.buffer.length !== 0) {
                    nxt();
                } else {
                    this.writing = false;
                }
            });
        };

        nxt();
    }
};

LMLContext.prototype.beginStack = function(lngName) {
    var curLevel = this.lib;
    var curStr = 0;
    var cmds = lngName.split(stackRegex);
    var finalValue;

    for (var i = 0; i < this.stack.length; i++) {
        var wk = cmds[i].trim();
    }

    return finalValue;
};

var findNextTag = function(context) {
    var nextOpener = context.text.indexOf(opener, context.cursor);
    var tagType = context.text.charAt(nextOpener + 1);

    if (nextOpener === -1) {
        context.done = true;
        context.writeToBuffer("");
    } else if (delimiters.indexOf(tagType) != -1) {
        writeToBuffer(nextOpener, context);
        context.cursor = nextOpener;

        switch (tagType) {
            case "=" : break;
            case "%" : break;
            case "#" : break;
            case "*" : break;
            case "$" : break;
        }
    } else {
        
    }
};

//
// CHALLENGE : 
// "(" + library.sublib.ftc( library.variable , 10,  library.getParam(  true, 10 - llibrary.total )).toString( ) + ")";
// 
LMLCompiler.prototype.compile = function(siteid, inputText, outputStream, options) {
    var ctx = new LMLContext();
    ctx.outstream = outputStream;
    ctx.text = inputText;
    ctx.siteConfig = configs.fetchConfig(siteid);

    findNextTag(ctx);
};

module.exports = new LMLCompiler();
