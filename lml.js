/*********************************************************************************************************
 *                                                                                                       *
 *  LML INTERPRETER | LILIUM MARKUP LANGUAGE INTERPRETER                                                 *
 *                                                                                                       *
 *  Author : Erik Desjardins                                                                             *
 *  Contributors : Samuel Rondeau-Millaire                                                               *
 *  Description : Interprets LML and renders ready to be served HTML files                               *
 *  Documentation : http://liliumcms.com/docs                                                            *
 *                                                                                                       *
 *********************************************************************************************************
 *                                                                                                       *
 *-- LML Tag Identifiers --------------------------------------------------------------------------------*
 *                                                                                                       *
 *       = Variable                                                                                      *
 *       * Live Variable                                                                                 *
 *       % Petal File Inclusion                                                                          *
 *       # Library Inclusion                                                                             *
 *       $ LML Slang wrapper                                                                             *
 *                                                                                                       *
 *********************************************************************************************************/

var LMLContext = require('./lmlcontext.js');
var fileserver = require('./fileserver.js');
var _c = require('./config.js');
var log = require('./log.js');
var Petals = require('./petal.js');

var LML = function () {
    // Reference to self
    var that = lml = thislml = this;

    // Print, execute, live, include, context
    const markSymbolOpen = '{';
    const markSymbolClose = '}';
    const slangOpening = 'lml';

    const symbols = ['=', '*', '%', '#', '$'];
    const symbolLen = symbols.length;
    const condIdentifiers = ["if", "while", "for", "block"];
    const condClosures = ["endif", "else", "endwhile", "endfor", "endblock"];
    const lmlOperators = ["+=", "-=", "*=", "/=", "=", "%="];

    // {=toplevellib.level1.level2}
    // {=toplevellib.func(paras:"value")}
    var execVariableTag = function (context, code, callback) {
        // Browse the context library for corresponding obhect;
        parseStringForRecursiveVarTags(context, code, function (code) {
            var txt = LMLSlang.pulloutVar(context, code);
            if (typeof txt === "object") {
                txt = JSON.stringify(txt);
            } else if (typeof txt === "undefiend") {
                txt = "";
            }

            context.w(txt);
            callback();
        });

        return true;
    };

    var fetchLiveParams = function (paramsString) {
        var json = {};

        if (paramsString) {
            var reg = /([^:]*:[^,]*),?/g;
            var matches = null;

            while ((matches = reg.exec(paramsString)) != null) {
                var str = matches[1];
                var key = str.substring(0, str.indexOf(':'));
                var val = str.substring(str.indexOf(':') + 1).replace(/^\"|\"$/g, "");
                json[key] = val;
            }
        }

        return json;
    };

    var stringifyLiveParams = function (json) {
        return JSON.stringify(json).replace(/"/g, '&lmlquote;');
    };
    
    // {*endpoint.level(params:"value")}
    var execLiveTag = function (context, code, callback) {
        var params = fetchLiveParams(context.extra.livevarsParams);
        var templatename = params.template || "";
        var targetname = params.target || "";
        var sourceof = params.sourceof || "";

        if (0 === sourceof.indexOf('=')) {
            sourceof = LMLSlang.pulloutVar(context, sourceof.substring(1));
        }

        if ("=" === code[0]) {
            code = code.substring(1);
            parseStringForRecursiveVarTags(context, code, function(code) {
                context.w('<lml:tobject data-key="' + code +
                    '" data-nodetype="' + (params.nodetype || "span") + 
                    (params.nodetype === 'a' ? ('" data-href="' + params.href) : '') + 
                    (params.filter ? ('" data-filter="' + params.filter) : '') + 
                    (params.action ? ('" data-action="' + params.action) : '') +
                    (params.actionparamkey ? ('" data-actionparamkey="' + params.actionparamkey) : '') +
                    (params.bind ? ('" data-bind="' + params.bind) : '') +
                    '"></lml:tobject>');
        
                callback();
            });
        } else {
            parseStringForRecursiveVarTags(context, code, function (code) {
                context.w('<lml:livevars data-varname="' + code +
                    '" data-template="' + templatename +
                    '" data-target="' + targetname +
                    '" data-sourceof="' + sourceof +
                    '" data-varparam="' + stringifyLiveParams(params) + '" ></lml:livevars>');
    
                callback();
            });
        }

        return true;
    };

    // {%petalname}
    var execIncludeTag = function (context, code, callback) {
        var split = code.split(';');
        var currentIndex = 0;

        var next = function () {
            if (currentIndex == split.length) {
                callback();
            } else {
                var fullpath = "";
                var executeLML = true;

                if (split[currentIndex][0] == "=") {
                    split[currentIndex] = LMLSlang.pulloutVar(context, split[currentIndex].substring(1));
                }

                if (Petals.isRegistered(split[currentIndex])) {
                    fullpath = Petals.get(split[currentIndex]).filepath;
                } else if (split[currentIndex][0] == '%') {
                    fullpath = split[currentIndex];
                    executeLML = false;
                } else {
                    fullpath = context.rootDir + "/" + split[currentIndex] + ".petal";
                }

                if (executeLML) {
                    that.executeToContext(fullpath, context, function (pContent) {
                        // context.merge();
                        currentIndex++;

                        next();
                    });
                } else {
                    var fullpath = LMLSlang.pulloutVar(context, fullpath.substring(1));

                    fileserver.readFile(fullpath, function (fContent) {
                        context.w(fContent || ("[LMLIncludeException] File not found : " + fullpath));
                        currentIndex++;
                        next();
                    }, false, 'utf8');
                }
            }
        };
        next();

        return true;
    };

    // {#lib1;lib2;lib3}
    var execContextTag = function (context, code, callback) {
        var codeArr = code.split(';');

        for (var i = 0, len = codeArr.length; i < len; i++) {
            context.loadLibrary(codeArr[i]);
        }

        callback();
        return true;
    };

    var parseStringForRecursiveVarTags = function (context, code, callback) {
        var openingPos = code.indexOf('{=');
        var closingPos = code.lastIndexOf('}');
        var contentLength = closingPos - openingPos - 2;

        if (openingPos !== -1) {
            recursiveVariableTag(context, code.substring((openingPos + 2), closingPos), function (replacedText) {
                callback(code.substring(0, openingPos) + replacedText + code.substring(closingPos + 1));
            });
        } else {
            callback(code);
        }
    };

    var recursiveVariableTag = function (context, code, callback) {
        var openingPos = code.indexOf('{=');
        var closingPos = code.lastIndexOf('}');
        var contentLength = closingPos - openingPos;

        if (openingPos !== -1) {
            recursiveVariableTag(context, code.substring(openingPos + 2, closingPos), function (replacedText) {
                var newStr = code.substring(0, openingPos) + replacedText + code.substring(openingPos + contentLength + 1);
                var endVal = LMLSlang.pulloutVar(context, newStr);

                callback(endVal);
            });
        } else {
            var endVal = LMLSlang.pulloutVar(context, code);
            callback(endVal);
        }
    };

    var LMLSlang = new(function () {
        this.validateClosure = function (condTag, closureTag) {
            var validClosure = (condTag == 'if' && closureTag == 'else' || closureTag == 'endif') ||
                (condTag == 'while' && closureTag == 'endwhile') ||
                (condTag == 'for' && closureTag == 'endfor') ||
                (condTag == 'block' && closureTag == 'endblock');

            if (!validClosure) {
                throw new Error("[LMLSlangException - Invalid closure] Found " + closureTag + " at the end of " +
                    condTag + " block");
            }

            return validClosure;
        };

        this.pushToCondStack = function (context, split) {
            var condObj = {
                condTag: split[0],
                values: [split[1], split[3]],
                operator: split[2],
                seekingElse: false,
                requiredSkip: 0,
                content: [],
                subContext: new Object(),
                buffer: "",
                lineIndex: context.currentLineIndex,
                forIndex: -1
            };

            // log('LML', 'Marked line index at ' + (condObj.lineIndex + 1) + ' for "' + condObj.condTag + '" block');
            context.condStack.push(condObj);
            return condObj;
        };

        this.createOpObject = function (context, split) {
            var opObj = {
                op: split[1],
                values: [split[0], split[2]],
                subContext: new Object()
            };

            return opObj;
        };

        this.pulloutVar = function (context, str) {
            var that = this;
            var endVal = str.trim();
            var acceptUndefined = endVal[0] === '?';

            if (acceptUndefined) {
                endVal = endVal.substring(1);
            }

            var encodeHTML = endVal[0] === "&";

            if (encodeHTML) {
                endVal = endVal.substring(1);
            }

            var isNumber = !isNaN(endVal);
            var isArray = '[' === endVal[0] && ']' === endVal.slice(-1);
            var isStringMatch = endVal.match(/^"(.*)"$|^'(.*)'$/g);

            if (isArray) {
                var obj = JSON.parse(endVal.split('|').join(','));
                return obj;
            } else if (isStringMatch) {
                endVal = endVal.slice(1, -1);
            } else if (!isNumber) {
                try {
                    var levels = endVal.split('.');
                    var useSlang = typeof context.slangContext[levels[0]] !== 'undefined';
                    if (useSlang || levels.length > 1) {
                        firstLevelLib = useSlang ?
                            context.slangContext[levels[0]] :
                            context.lib[levels[0]];

                        if (!useSlang && typeof firstLevelLib === 'undefined') {
                            throw new Error("LMLParseException - Undefined root level context library or LML slang : " + levels[0]);
                        }

                        // Go through all levels
                        endVal = firstLevelLib;
                        for (var i = 1, len = levels.length; i < len; i++) {
                            if (levels[i].indexOf('(') !== -1) {
                                pos = levels[i].indexOf('(');
                                var curLevel = levels[i];
                                ftcName = curLevel.substr(0, pos);

                                if (typeof endVal[ftcName] === 'function') {
                                    var params = curLevel.substr(
                                        curLevel.indexOf('(') + 1,
                                        curLevel.indexOf(')') - curLevel.indexOf('(') - 1
                                    ).split(',').map(function (str) {
                                        str = str.trim();
                                        if (0 === str.indexOf('=')) {
                                            str = that.pulloutVar(context, str.substring(1));
                                        } else if ('[' === str[0]) {
                                            return that.pulloutVar(context, str);
                                        }

                                        var finalval;
                                        if (!isNaN(str)) {
                                            finalval = parseInt(str);
                                        } else if (typeof str == "string") {
                                            finalval = str.replace(/(^["'])|(["']$)|(\|)/g, "");
                                        } else {
                                            finalval = str;
                                        }

                                        return finalval;
                                    });

                                    endVal = endVal[ftcName].apply(endVal, params);
                                } else {
                                    throw new Error("LMLParseException - Call to undefined funtion : " + ftcName);
                                }
                            } else if (levels[i].indexOf('=') !== -1) {
                                endVal = endVal[that.pulloutVar(context, levels[i].substring(1))];
                            } else {
                                endVal = endVal[levels[i]];
                            }

                            if (typeof endVal === 'undefined') {
                                var err = new Error("LMLParseException - Undefined branch " +
                                    levels[i] + " in " + (useSlang ? "LML Slang" : "context library") + " : " +
                                    levels[0]);

                                err.acceptUndefined = acceptUndefined;
                                throw err;
                            }
                        }
                    } else if (levels.length == 1 && (levels[0] == 'true' || levels[0] == 'false')) {
                        return levels[0] == 'true';
                    } else if (str.trim() == "" || levels.length == 0) {
                        throw new Error("LMLParseException - Variable cannot be empty. Tried to read : '" + str + "'");
                    } else {
                        throw new Error("LMLParseException - Cannot print root level of library '"+levels[0]+"', LML slang not found");
                    }
                } catch (ex) {
                    endVal = ex.acceptUndefined ? "" : ("[" + ex + "]");
                }
            } else {
                endVal = parseInt(str);
            }

            if (encodeHTML && endVal && endVal.length !== 0) {
                endVal = endVal.replace(/\>/g, "&gt;").replace(/\</g, "&lt;").replace(/\"/g, "&quot;");
            }

            return endVal;
        };

        this.compare = function (val1, val2, op) {
            if (typeof val1 === 'object' && typeof val2 === 'object') {
                var condObj = val1;
                var firstVal = this.pulloutVar(val2, condObj.values[0]);
                var compVal = this.pulloutVar(val2, condObj.values[1]);
                op = condObj.operator;

                val2 = compVal;
                val1 = firstVal;
            }

            switch (op) {
            case "==":
                return val1 == val2;
            case ">":
                return val1 > val2;
            case "<":
                return val1 < val2;
            case ">=":
                return val1 >= val2;
            case "<=":
                return val1 <= val2;
            case "!=":
                return val1 != val2;
            };
        };

        this.affect = function (context, varName, value) {
            var levels = varName.split('.');
            var currentLvl = context.slangContext;

            for (var i = 0; i < levels.length - 1; i++) {
                if (typeof currentLvl[levels[i]] !== 'object') {
                    currentLvl[levels[i]] = new Object();
                }
                currentLvl = currentLvl[levels[i]];
            }

            currentLvl[levels[levels.length - 1]] = value;
            return value;
        };

        this.processCondition = function (context, condObj) {
            var firstVal = this.pulloutVar(context, condObj.values[0]);
            var compVal = this.pulloutVar(context, condObj.values[1]);
            var op = condObj.operator;

            var truthfulness = this.compare(firstVal, compVal, op);
            context.skipUntilClosure = !truthfulness;

            return truthfulness;
        }

        this.processLoop = function (context, condObj) {
            context.storeUntilClosure = true;
            return true;
        };

        this.processOperation = function (context, opObj) {
            var affectedName = opObj.values[0];
            var affectedValue = this.pulloutVar(context, affectedName);
            var effect = this.pulloutVar(context, opObj.values[1]);

            switch (opObj.op) {
            case "=":
                return this.affect(context, affectedName, effect);
            case "+=":
                return this.affect(context, affectedName, affectedValue + effect);
            case "-=":
                return this.affect(context, affectedName, affectedValue - effect);
            case "*=":
                return this.affect(context, affectedName, affectedValue * effect);
            case "/=":
                return this.affect(context, affectedName, affectedValue / effect);
            case "%=":
                return this.affect(context, affectedName, affectedValue % effect);
            case "&=":
                return this.affect(context, affectedName, affectValue);
            }
        };

        this.processForLoop = function (context, condObj) {
            var affectedName = condObj.values[0];
            var _arr = this.pulloutVar(context, condObj.values[1]);
            condObj.forIndex++;
            if (_arr.length == 0 || condObj.forIndex >= _arr.length || condObj.forIndex >= Object.keys(_arr).length) {
                context.skipUntilClosure = true;
                // log("LML", "Finished " +(condObj.nested?"nested ":"")+ "loop after " + condObj.forIndex + " iterations.");
                
                if (condObj.forIndex != 0) {    
                    context.lineFeedback.jumpTo = condObj.closureIndex;
                    // log('LML', "Hard skipping to line " + (condObj.closureIndex));
                } else {
                    // log('LML', "Loop did not iterate. Looking for next closure.");
                }
            } else {
                this.affect(context, affectedName, _arr[condObj.forIndex]);
            }
        };
    })();

    // REALLY, REALLY FREAKING SLOW, MUST FIND ALTERNATIVE TO HUGE REGEX OMG SERIOUSLY :'(
    var execLMLTag = function (context, code, callback) {
        // LML parsing
        var selector = /(if|while)[\s]*\([\s]*([^\s]+)[\s]*(==|<=?|>=?|!=|\?=)[\s]*([^\n]*)[\s]*\)|(block)[\s]*\([\s]*([^\s]+)[\s]*([^\n]*)[\s]*\)|(for)[\s]*\([\s]*([^\s]+)[\s]+(in)[\s]+([^\s]+)[\s]*\)|(endblock|else|endif|endfor|endwhile)|([a-zA-Z0-9\.]+)[\s]*([\+|\-|\*|\%|\/]=?|=)[\s]*([a-zA-Z0-9\.]+[\s]*(\(.*\))?|["|'\[][^\n]+["|'\]])|\/\/([^\n]+)|([a-zA-Z0-9\.]+)[\s]*\((.*)\)/g;
        var closureSelector = /(else|endif|endfor|endwhile|endblock)/g;

        // Split in lines array, all commands have
        var lines = typeof code === 'string' ? code.split(/\n|;/g) : code;
        var lineNumber = 0;
        var maxLine = lines.length;
        var handleLMLLine = function () {
            var line = lines[lineNumber].trim();
            if (line != "") {
                var match = line.match(selector);

                // Check for block opening or closure
                if (match && match.length > 0) {
                    match = match[0];
                    var split = match.split(selector).filter(function (str) {
                        return str != undefined && str != "";
                    });

                    // If closure detected
                    if (condClosures.indexOf(split[0]) != -1) {
                        if (context.condStack.length == 0) {
                            var errmsg = "Block closure found while stack is empty : " + split[0];
                            throw new Error(errmsg);
                        }

                        var curCond = context.condStack.pop();
                        var closureTag = split[0];

                        if (curCond.requiredSkip > 0) {
                            curCond.requiredSkip--;
                            context.condStack.push(curCond);
                        } else {
                            LMLSlang.validateClosure(curCond.condTag, closureTag);
                            context.currentBlock = (context.condStack.length == 0) ?
                                "lml" :
                                context.condStack[context.condStack.length - 1].condTag;

                            if (split[0] == 'else') {
                                context.skipUntilClosure = !context.skipUntilClosure;
                                context.condStack.push(curCond);
                            } else {
                                if (curCond.condTag == 'while' || curCond.condTag == 'for') {
                                    curCond.closureIndex = context.currentLineIndex;

                                    if (!context.skipUntilClosure) {
                                        context.lineFeedback.jumpTo = curCond.lineIndex;
                                        context.condStack.push(curCond);
                                        context.temp.looping = true;
                                    } else {
                                        var childCond = context.condStack[context.condStack.length - 1];
                                        context.temp.looping = !(typeof childCond === 'undefined' || 
                                            (childCond.condTag !== 'for' && childCond.condTag !== 'while'));
                                    }
                                }

                                context.storeUntilClosure = false;
                                context.skipUntilClosure = false;
                            }
                        }
                    } else if (condIdentifiers.indexOf(split[0]) != -1) {
                        if (context.skipUntilClosure) {
                            var cstack = context.condStack[context.condStack.length - 1];
                            cstack.requiredSkip++;
                        } else {
                            var condObj = undefined;
                            if (context.temp.looping) {
                                condObj = context.condStack[context.condStack.length - 1];
                                context.temp.looping = false;
                            } else {
                                condObj = LMLSlang.pushToCondStack(context, split);
                                if (condObj.condTag === 'for') {
                                    if (
                                        context.condStack.length != 1 && 
                                        context.condStack[context.condStack.length - 2].condTag == "for"
                                    ) {
                                        condObj.nested = true;
                                    } else {
                                        condObj.nested = false;
                                    }
                                }
                            }

                            context.currentBlock = condObj.condTag;

                            // Process conditions
                            switch (condObj.condTag) {
                            case 'if':
                            case 'while':
                                LMLSlang.processCondition(context, condObj);
                                break;

                            case 'for':
                                LMLSlang.processForLoop(context, condObj);
                                break;
                            }
                        }
                    } else if (lmlOperators.indexOf(split[1]) != -1) {
                        if (!context.skipUntilClosure) {
                            var opObj = LMLSlang.createOpObject(context, split);
                            LMLSlang.processOperation(context, opObj);
                        }
                    }
                } else {
                    // Nothing was found that matches LML Slang
                    var errmsg = "Unrecognized operation in " + (context.rootPath || "LML file") + " @ line " + context.currentLineIndex;
                    log('LMLParserException', errmsg, 'warn');
                    log('LMLError', "Unknown operation : " + line, 'err');
                    throw new Error(errmsg);
                }
            }

            lineNumber++;

            if (lineNumber == maxLine) {
                callback();
            } else {
                setTimeout(handleLMLLine, 0);
            }
        };

        if (maxLine != 0) {
            try {
                handleLMLLine();
            } catch (ex) {
                log("LMLParserException", ex +
                    " in " + (context.rootPath || "LML file") +
                    " @ line " + context.currentLineIndex, 'warn');
                log("Stacktrace", ex.stack, 'warn');
                callback(new Error("[Fatal] [LMLParserException] Could not recover from fatal error"));
            }
        }

        return true;
    };

    var execTagContent = function (context, callback) {
        var code = context.cachedCommand;
        var tag = context.currentInTag;

        switch (tag) {
        case "=":
            return execVariableTag(context, code, callback);
            break;

        case "*":
            return execLiveTag(context, code, callback);
            break;

        case "%":
            return execIncludeTag(context, code, callback);
            break;

        case "#":
            return execContextTag(context, code, callback);
            break;

        case "$":
            return execLMLTag(context, code, callback);
            break;

        default:
            throw new Error("LMLParseException - Error fetching current tag. Cached character is : " + tag);
        }

        return false;
    };

    // Content of line should be trimmedd
    var parseLine = function (line, context, lineCallback, linetype) {
        // line = line.trim();
        if (line.length == 0) {
            lineCallback(context.lineFeedback);
            return;
        }

        if (linetype == "plain") {
            if (!context.skipUntilClosure) {
                context.w(line);
            }

            lineCallback(context.lineFeedback);
            return;
        }

        // String is added from context.newLine to context.compiled
        // lineCallback() is called at the end of line
        // context.cachedCommand contains content of {}
        // context.storedBuffer contains content of block (while and for)
        // Normal HTML is just added to context.compiled
        // context.currentInTag contains current tag context, eg. = or %
        var detectPos = line.length;
        var detectLength = line.length;
        var nextWorkPos = 0;

        // Needs to be precompiled every line
        // ALSO FREAKING SLOW OMG PLEASE LET'S CHANGE THIS REGEX TO SOMETHING ELSE HUHHH
        var lmlDetectRegex = /{(#|%|=)([^\n\s\}]*)}|({\$|\$})|{(\*)([^\n\s\(]*)\(?(([^\n\s]*\s*:\s*"?[A-Za-z0-9À-ÿ\_\#\>\<\/\=\+\-.\s\']*"?,?\s*)*)\)?}/g;
        var seekLML = function () {
            if (nextWorkPos >= line.length) {
                lineCallback(context.lineFeedback);
            } else if (context.isLMLTag) {
                context.currentInTag = "$";
                var crop = line.substring(nextWorkPos);

                nextWorkPos += crop.length;
                if (crop.indexOf('$}') != -1) {
                    crop = crop.substring(0, crop.indexOf('$}'));
                    context.isLMLTag = false;
                }

                context.cachedCommand = crop;
                execTagContent(context, seekLML);
            } else if (context.skipUntilClosure) {
                var ind = line.indexOf('{$');
                if (ind != -1) {
                    context.isLMLTag = true;
                    nextWorkPos = ind + 2;
                } else {
                    nextWorkPos = line.length;
                }

                setTimeout(seekLML, 0);
            } else if (line.indexOf('{') != -1 && (lmlMatch = lmlDetectRegex.exec(line)) != null) {
                detectPos = lmlMatch.index;
                detectLength = lmlMatch[0].length;
                if (typeof lmlMatch[1] !== 'undefined' || typeof lmlMatch[4] !== "undefined") {
                    var cropLength = detectPos - nextWorkPos;
                    var comp = line.substring(nextWorkPos).substring(0, cropLength);

                    context.w(comp);
                    context.currentInTag = lmlMatch[1] || lmlMatch[4];
                    context.cachedCommand = lmlMatch[2] || lmlMatch[5];
                    context.extra.livevarsParams = lmlMatch[6];

                    nextWorkPos = detectPos + detectLength;
                    execTagContent(context, seekLML);
                } else {
                    // Is LML opening
                    context.isLMLTag = true;
                    nextWorkPos = detectPos + detectLength;
                    setTimeout(seekLML, 0);
                }
            } else {
                context.w(line.substring(nextWorkPos));
                lineCallback(context.lineFeedback);
            }
        };

        setTimeout(seekLML, 0);
    };

    // Parses content, and returns partial strings through a callback
    // The value returned is undefined when everything is done
    this.parseContent = function (rootpath, content, callback, context, extra, sync, outputstream) {
        var lines = [];
        var done = false;
        var pos = -1;
        var nxt = 0;
        var cls = 0;
        var acceptPosNxt = false;

        while (!done) {
            nxt = content.indexOf("{", pos);

            while (symbols.indexOf(content[nxt+1]) == -1 && nxt != -1) {
                nxt = content.indexOf('{', nxt+1);
            }

            if (nxt != -1 && pos != nxt || acceptPosNxt) {
                acceptPosNxt = false;
                lines.push({
                    text : content.substring(pos, nxt),
                    type : "plain"
                });

                var chr = content[nxt+1];
                switch (chr) {
                    case "$":
                        cls = content.indexOf('$}', nxt) + 2;
                    default:
                        var recur = true;
                        var cls = content.indexOf('}', nxt);
                        var vNxt = nxt+1;
                        while ((mv = content.indexOf('{', vNxt)) < cls && mv != -1) {
                            cls = content.indexOf('}', cls+1);
                            vNxt = mv+1;
                        }
                        cls++;
                }

                lines.push({
                    text : content.substring(nxt, cls),
                    type : chr
                });
                pos = cls;

                if (content[pos] == '{') {
                    acceptPosNxt = true;
                }
            } else {
                lines.push({
                    text : content.substring(pos),
                    type : "plain"
                });

                done = true;
            }
        }

        /*
        if ((txt = lines.map(function(elem) { return elem.text}).join('')) != content) {
            var dfs = require('diff').diffTrimmedLines(txt, content);
            if (dfs.length > 1) {
                throw new Error("Error while doing the split");
            }
        }
        */

        var cLine = 0,
            lineTotal = lines.length;

        if (typeof context === 'undefined') {
            context = new LMLContext();
            context.rootDir = fileserver.dirname(rootpath);
            context.config = extra.config;
            context.theme = extra.theme;
            context.setStream(outputstream);

            delete extra.config;
        } 

        if (typeof extra !== 'undefined') {
            context.extra = extra;
            context.theme = extra.theme || context.theme;
            context.config = extra.config || context.config;
        }

        if (lineTotal != 0) {
            var cont = function () {
                setTimeout(function () {
                    parseLine(lines[cLine].text, context, function (feedback) {
                        if (feedback) {
                            if (typeof feedback.jumpTo !== 'undefined') {
                                cLine = feedback.jumpTo;
                                feedback.jumpTo = undefined;
                            }
                        }

                        context.currentLineIndex = cLine;
                        cLine++;

                        if (cLine == lineTotal) {
                            callback(context);
                        } else {
                            cont();
                        }
                    }, lines[cLine].type);
                }, 0);
            };
            cont();
        } else {
            setTimeout(function () {
                callback(context);
            }, 0);
        }

        return context;
    };

    this.executeToContext = function (rootpath, context, callback) {
        fileserver.fileExists(rootpath, function (exists) {
            if (exists) {
                fileserver.readFile(rootpath, function (content) {
                    that.parseContent(rootpath, content, callback, context);
                }, false, 'utf8');
            } else {
                context.w("[LMLIncludeNotFound : " + rootpath + "]");
                callback();
            }
        });
    };

    this.executeFromString = function(contextpath, content, callback, extra) {
        var timeStamp = new Date();
        var html = "";
        var buffer = new (function() {
            this._c = "";
            this.write = function(str, format, cb) {
                this._c += str;
                cb();
            }   
        })();

        var verifyEnd = function () {
            callback(buffer._c);
        }

        that.parseContent(contextpath, content, verifyEnd, undefined, extra, false, buffer);
    };

    this.executeToHtml = function (rootpath, callback, extra) {
        var timeStamp = new Date();
        var html = "";
        var buffer = new (function() {
            this._c = "";
            this.write = function(str, format, cb) {
                this._c += str;
                cb();
            }   
        })();

        fileserver.readFile(rootpath, function (content) {
            var verifyEnd = function () {
                log('LML', 'Compiled File : ' + rootpath + ' in ' + (new Date() - timeStamp) + 'ms', 'success');
                callback(buffer._c);
            }

            that.parseContent(rootpath, content, verifyEnd, undefined, extra, false, buffer);
        }, false, 'utf8');
    }

    this.executeToFile = function (rootpath, compilepath, callback, extra) {
        log("LML", rootpath + " => " + compilepath, 'info');

        var timeStamp = new Date();
        // TODO create a temp file first
        fileserver.createDirIfNotExists(compilepath, function (dirExists) {
            if (!dirExists) throw new Error("LMLAccessException - Could not create directory for " + compilepath);

            fileserver.readFile(rootpath, function (content) {
                var fileHandle = fileserver.getOutputFileHandle(compilepath, 'w+', 'utf8');
                var context = that.parseContent(rootpath, content, function(context) {
                    context.flagEnd();
                }, undefined, extra, false, fileHandle);

                context.bindFinished(function (context) {
                    fileserver.closeFileHandle(fileHandle);

                    log('LML', 'Generated file : ' + compilepath + ' in ' + (new Date() - timeStamp) + 'ms', 'success');

                    var willMinify = !extra || extra.minify;
                    if (willMinify) {
                        fileserver.minifyHTML(compilepath, callback);
                    } else {
                        callback();
                    }
                });

            }, false, 'utf8');
        });
    }

    var init = function () {

    };

    init();
};

module.exports = new LML();
