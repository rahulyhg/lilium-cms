// Lilium Markup language
// v1.3 Gaia
var log = require('../log.js');
var lmllib = require('../lmllib.js');
var configs = require('../config.js');
var WARNING_EVAL = eval;

const opetators = ["+", "-", "*", "/", "=", "!", ">", "<"];
const delimiters = ["=", "$", "%", "#", "*"];
const constants = ["true", "false", "null", "undefined"];
const stackRegex = /([\!\=\+\-\*\/\,\.\(\)])/;
const opener = "{";

var noOp = function() {};
var LMLCompiler = function() {};

var stacks = [];

var LMLContext = function() {}
    LMLContext.prototype.outstream;
    LMLContext.prototype.siteConfig;
    LMLContext.prototype.text = "";
    LMLContext.prototype.cursor = 0;
    LMLContext.prototype.stack = [];
    LMLContext.prototype.functionStack = [];
    LMLContext.prototype.initialized = false;
    LMLContext.prototype.buffer = [];
    LMLContext.prototype.writing = false;
    LMLContext.prototype.done = false;
    LMLContext.prototype.endHook = noOp;
    LMLContext.prototype.lib = {};
    LMLContext.prototype.affectation = false;
    
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

LMLContext.prototype.burnFunction = function() {

};

LMLContext.prototype.pulloutValue = function() {
    
};

LMLContext.prototype.operand = function(left, operator, right) {
    switch (operator) {
        case "+":   return left + right;   break;
        case "-":   return left - right;   break;
        case "*":   return left * right;   break;
        case "/":   return left / right;   break;
        case "+=":  return left += right;  break;
        case "-=":  return left -= right;  break;
        case "*=":  return left *= right;  break;
        case "/=":  return left /= right;  break;
        case "==":  return left == right;  break;
        case "!=":  return left != right;  break;
        case ">" :  return left > right;   break;
        case "<" :  return left < right;   break;
        case "<=":  return left <= right;  break;
        case ">=":  return left >= right;  break;
        case "===": return left === right; break;

        default:   throw new Error("[LMLParseException] - Use of undefined LML operator " + operator);
    }
};

LMLContext.prototype.burnStack = function() {
    // Current stack value
    var stackValue;
    var stackedOperator;
    var stackedChain;
    var workingValue;
    var toAffect;
    var finalValue;

    for (var i = 0; i < this.stack.length; i++) {
        var curStack = this.stack[i];

        // string, operator, 
        switch (curStack.type) {
            case "string":
                if (stackedOperator) {
                    finalValue = this.operand(finalValue, stackOperator, curStack.value);
                    stackedOperator = undefined;
                } else {
                    finalValue = curStack.value;
                }
                break;

            case "operator":
                if (stackedOperator) {
                    stackedOperator += curStack.value;
                } else {
                    stackedOperator = curStack.value;
                }
                break;

            
        }
    }

    // Run stack command
    return this.stack;
};

LMLContext.prototype.createFunction = function(ftc) {
    this.functionStack.push({
        func : ftc,
        params : []
    });
};

LMLContext.prototype.beginStack = function(lngName) {
    var curLevel = this.lib;
    var curStr = 0;
    var cmds = lngName.split(stackRegex);
    var finalValue;
    var isInString = false;

    for (var i = 0; i < this.stack.length; i++) {
        var wk = cmds[i].trim();
        var mk = wk;

        if (wk === "") {
            continue;
        } else if (!this.affectation && wk === "=") {
            this.affectation = true;
        }

        if (wk == '"') {
            // String delimiter
            if (!isInString) {
                this.stack.push({
                    type : "string",
                    originalValue : false,
                    value : ""
                });
            }

            isInString = !isInString;
        } else if (isInString) {
            // Concat to last stack object
            this.stack[this.stack.length-1].value += wk;
        } else if (operators.indexOf(wk) !== -1) {
            // Equation Operator
            this.stack.push({
                type : "operator",
                value : wk,
                originalValue : wk
            });
        } else if (wk === '.') {
            // Object operator
            this.stack.push({
                type : "parent",
                value : wk,
                originalValue : "."
            });
        } else if (wk === ",") {
            // Parameter separator
            this.stack.push({
                type : "separator",
                value : wk,
                originalValue : wk
            });
        } else if (!isNaN(wk)) {
            // Is actually a number
            var numVal = parseInt(mk);
            this.stack.push({
                type : "number",
                value : numVal,
                originalValue : mk
            });
        } else if (constants.indexOf(wk) !== -1) {
            // EVAL HERE //////////////////////////////////////////////////////////////////////////
            // Is a constant. SAFE eval, can only be a value contained in the "constants" array  //
            // Injection should not be possible unless the "constants" const array is modified   //
            this.stack.push({                                                                   ///
                value : /* We all hate eval, but there it is. */ WARNING_EVAL(mk),          ///////
                type : "constant",                                                      ///////////
                originalValue : mk                                                  ///////////////
            });                                                                  ///////////////////
            //                                                       //////////////////////////////
            ///////////////////////////////////////////////////////////  Yes, I'm paranoid too.  //
         } else if (wk === "(") {                                    //  And I love formatting.  //
            // Is parameter opener                                   /////////////////////////////
            this.stack.push({
                value : wk,
                type : "paramstart"
                originalValue : wk
            });
        } else if (wk === ")") {
            // Is parameter closure
            this.stack.push({
                value : wk,
                type : "paramend"
                originalValue : wk
            });
        } else {
            // Look in library for an object
            this.stack[this.stack.length-1].push({
                value : mk,
                type : "identifier",
                originalValue : mk
            });
        }
    }

    return this.burnStack();
};

var findNextTag = function(context) {
    var nextOpener = context.text.indexOf(opener, context.cursor);
    var tagType = context.text.charAt(nextOpener + 1);

    if (nextOpener === -1) {
        context.done = true;
        context.writeToBuffer("");
    } else if (delimiters.indexOf(tagType) != -1) {
        writeToBuffer(nextOpener);
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
