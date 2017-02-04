const log = require('../log.js');
const configs = require('../config.js');
const lmllib = require('../lmllib.js');
const Petals = require('../petal.js');
const fileserver = require('../fileserver.js');
const opChar = '{';
const clChar = '}';

class LMLContext {
    constructor(config, string, stream, extra, cb) {
        this.s = string;
        this.stream = stream;
        this.extra = extra;
        this.config = config;
        this.buffer = [];
        this.flags = this.makeFlags();

        this.blocks = [];
        this.blockIndex = -1;

        this.done = cb;
        this.slang = new LMLSlang();

        this.lib = {
            config : config,
            extra : extra,
            "false" : false,
            "true" : true,
            "undefined" : undefined,
            "null" : null
        };

        this.stash = [];
        this.loops = [];
    };

    makeFlags() {
        return {
            finished : false,
            writing : false,
            closed : false,
            skipping : false,
            looping : false,
            toSkip : 0
        };
    };

    store(string, extra, cb) {
        this.stash.push({
            s : this.s,
            blocks : this.blocks,
            blockIndex : this.blockIndex,
            done : this.done,
            flags : this.flags
        });

        this.s = string;
        this.extra = Object.assign(this.extra, extra);
        this.done = cb;
        this.blocks = [];
        this.blockIndex = -1;
        this.flags = this.makeFlags();
    };

    restore() {
        let oldState = this.stash.pop();

        this.s = oldState.s;
        this.blocks = oldState.blocks;
        this.blockIndex = oldState.blockIndex;
        this.done = oldState.done;
        this.flags = oldState.flags;
    };
}

class LMLSlang {
    /*
        library.object.function(param.val, lib.ftc(a, b), param2.something).prop.ftc(1, 2, prop.something());
    */
    getReturn(ctx, line, flags) {
        line = line.trim();

        if (!flags) {
            flags = {};
            while (line[0] == "?" || line[0] == "&") {
                flags[line[0]] = true;
                line = line.substring(1);
            }
        }

        if (line[0] == '"' || line[0] == "'") {
            return line.slice(1, -1);
        } else if (!isNaN(line)) {
            return parseInt(line);
        }

        let scope = ctx.lib;
        let levels = [];
        let curVal = scope;

        let dotIndex = line.indexOf('.');
        let startIndex = 0;
        let seeking = dotIndex != -1;
        let willClose = false;
        let undefinedReplacement = "";

        if (flags['?']) {
            let cSplit = line.split(':');
            line = line[0];
            undefinedReplacement = line[1];
        }
        
        while(seeking || !willClose) {
            if (!seeking) {
                dotIndex = line.length;
                willClose = true;
            }

            let workStr = line.substring(startIndex, dotIndex);

            if (workStr.indexOf('(') != -1) {
                let virtualStart = startIndex + workStr.indexOf('(') + 1;
                let virtualCursor = virtualStart;
                let paramsName = [];

                const opCode = "(".charCodeAt();
                const clCode = ")".charCodeAt();
                const sepCode = ",".charCodeAt();

                let tokenCount = 0;
                let seekingClosure = true;
                let closureIndex = virtualStart + 1;
                let max = line.length;
                while (seekingClosure) {
                    let code = line.charCodeAt(virtualStart);
                    if (virtualStart == max) {
                        return new Error("[LMLSyntaxException] Missing function closure in line " + line);
                    }

                    if (code == clCode) {
                        if (tokenCount == 0) {
                            paramsName.push(line.substring(virtualCursor, virtualStart));
                            seekingClosure = false;
                        } else {
                            tokenCount--;
                        }
                    } else if (code == opCode) {
                        tokenCount++;
                    } else if (code == sepCode) {
                        if (tokenCount == 0) {
                            paramsName.push(line.substring(virtualCursor, virtualStart));
                            virtualCursor = virtualStart+1;
                        }
                    }

                    virtualStart++;
                }
                
                levels.push({
                    type : "function",
                    name : workStr.substring(0, workStr.indexOf('(')),
                    params : paramsName
                });

                dotIndex = virtualStart;
            } else if (workStr) {
                levels.push({
                    type : "level",
                    name : workStr
                });
            }

            startIndex = dotIndex + 1;
            dotIndex = line.indexOf('.', startIndex); 

            if (dotIndex == -1) {
                seeking = false;
            } 
        }

        let caller = curVal;
        for (let i = 0; i < levels.length; i++) {
            curVal = curVal[levels[i].name];

            if (typeof curVal == 'undefined' || curVal == null) {
                if (flags["?"]) {
                    curVal = undefinedReplacement ? this.getReturn(undefinedReplacement, flags) : "";
                    break;
                } else {
                    curVal = new Error("[LMLSlangException] Undefined branch {" + levels[i].name + "} in line {" + line + "}");
                }
            } 
            
            if (levels[i].type == "function" && typeof curVal == "function") {
                let params = [];
                for (let j = 0; j < levels[i].params.length; j++) {
                    params[j] = this.getReturn(ctx, levels[i].params[j], flags);
                }
                
                curVal = curVal.apply(caller, params);
            }

            caller = curVal;
        }

        let type = typeof curVal;
        if (type == "string") {
            curVal = curVal.trim();
            if (curVal != "" && !isNaN(curVal) && curVal[0] != "0") {
                curVal = parseFloat(curVal);
            } else if (flags["&"]) {
                curVal = curVal.replace(/\</g, "&lt;").replace(/\>/g, "&gt;").replace(/\"/g, "&quot;"); 
            }
        } 

        return curVal;
    }
};

class LMLExecutor {
    constructor() {
        this.affectors = ["+=", "-=", "/=", "*=", "%=", "="];
        this.comparors = ["==", "!=", " in ", "<", ">", "<=", ">=", "??"];
        this.stackOp = ["if", "for", "while"];
        this.stackCl = ["end", "endif", "else", "endfor", "endwhile"];
    };
    
    isAffectation(line) {
        for (let i = 0; i < this.affectors.length; i++) if (line.indexOf(this.affectors[i]) != -1) {
            return { op : this.affectors[i], strIndex : line.indexOf(this.affectors[i]) };
        }

        return false;
    };

    isCondStack(line) {
        for (let i = 0; i < this.stackOp.length; i++) if (line.indexOf(this.stackOp[i]) == 0) {
            let condition = line.substring(this.stackOp[i].length, line.length-1).trim().substring(1);
            let comparees = [];
            let operator = "??";

            let charValidator = line[this.stackOp[i].length];
            if (charValidator != " " && charValidator != "(") {
                return false;
            }

            for (let j = 0; j < this.comparors.length; j++) if (condition.indexOf(this.comparors[j]) != -1) {
                operator = this.comparors[j];
                comparees = condition.split(operator);
            }

            if (comparees.length == 0) {
                comparees = [condition, undefined];
            }

            return { stacktag : this.stackOp[i], comparees : comparees, operator : operator };
        }

        return false;
    };

    isClosure(line) {
        for (let i = 0; i < this.stackCl.length; i++) if (line == this.stackCl[i]) {
            return { closure : this.stackCl[i] };
        }

        return false;
    };

    runAffect(line, opObj, ctx) {
        let affected = line.substring(0, opObj.strIndex).trim();
        let affector = ctx.slang.getReturn(ctx, line.substring(opObj.strIndex + opObj.op.length).trim());

        switch(opObj.op) {
            case "="  : ctx.lib[affected] = affector; break;
            case "+=" : ctx.lib[affected] += affector; break;
            case "-=" : ctx.lib[affected] -= affector; break;
            case "/=" : ctx.lib[affected] /= affector; break;
            case "*=" : ctx.lib[affected] *= affector; break;
            case "%=" : ctx.lib[affected] %= affector; break;
        }
    }

    runCondStack(line, condObj, ctx) {
        if (ctx.flags.skipping) {
            return ctx.flags.toSkip++;
        } else {
            switch (condObj.stacktag) {
                case "if":
                case "while":
                    let truthfulness = false;
                    let rightVal = ctx.slang.getReturn(ctx, condObj.comparees[0]);
                    let leftVal  = ctx.slang.getReturn(ctx, condObj.comparees[1]);

                    switch (condObj.operator) {
                        case "==": truthfulness = rightVal == leftVal; break;
                        case "!=": truthfulness = rightVal != leftVal; break;
                        case ">" : truthfulness = rightVal >  leftVal; break;
                        case "<" : truthfulness = rightVal <  leftVal; break;
                        case ">=": truthfulness = rightVal >= leftVal; break;
                        case "<=": truthfulness = rightVal <= leftVal; break;
                        case "??": truthfulness = rightVal;
                    }

                    if (!truthfulness) {
                        ctx.flags.skipping = true;
                    }

                    if (condObj.stacktag == "while") {
                        ctx.loops.push({
                            at : ctx.blockIndex - 1,
                            line : line,
                            condObj : condObj
                        });
                        ctx.flags.looping = true;
                    }
            
                    break;

                case "for":
                    let varname = condObj.comparees[0];
                    let loopee  = ctx.slang.getReturn(ctx, condObj.comparees[1]);
                    let loopObject = {
                        at : ctx.blockIndex,
                        loopee : loopee,
                        keys : Object.keys(loopee),
                        affect : varname,
                        index : -1
                    }

                    ctx.loops.push(loopObject);
                    this.runFor(ctx);
                    break;
            };
        }
    };

    runFor(ctx) {
        var loopobj = ctx.loops[ctx.loops.length - 1];
        loopobj.index++;

        ctx.blockIndex = loopobj.at;
        if (loopobj.index == loopobj.keys.length) {
            ctx.loops.pop();
            ctx.flags.skipping = true;
            ctx.flags.looping = false;
        } else { 
            ctx.flags.looping = true;
            ctx.lib[loopobj.affect] = loopobj.loopee[loopobj.keys[loopobj.index]];
        }
    };

    runWhile(ctx) {
        var loopobj = ctx.loops.pop();
        ctx.blockIndex = loopobj.at;
        ctx.flags.looping = false;
        runCondStack(loopobj.line, loopobj.condObj, ctx);
    };

    runClosureStack(line, ctx) {
        if (ctx.flags.toSkip != 0) {
            return ctx.flags.toSkip--;
        } else {
            if (line == "else") {
                ctx.flags.skipping = !ctx.flags.skipping;
            } else if (line == "endif") {
                ctx.flags.skipping = false;
            } else if (line == "endfor") {
                if (ctx.flags.skipping) {
                    ctx.flags.skipping = false
                } else { 
                    this.runFor(ctx);
                }
            } else if (line == "endwhile") {
                if (ctx.flags.skipping) {
                    ctx.flags.skipping = false
                } else { 
                    this.runWhile(ctx);
                }
            }
        }
    };

    isDeepLML(line) {
        let fChar = line[0];
        return fChar == "%" || fChar == "=";
    };

    execute(ctx, line) {
        let isDeepLML   = this.isDeepLML(line);
        let condStack   = !isDeepLML && this.isCondStack(line);
        let condClosure = !condStack && this.stackCl.indexOf(line) != -1;
        let affectation = !ctx.flags.skipping && !condClosure && this.isAffectation(line);

        if (condStack) {
            this.runCondStack(line, condStack, ctx);
        } else if (condClosure) {
            this.runClosureStack(line, ctx);
        } else if (affectation) {
            this.runAffect(line, affectation, ctx);
        }
    };
};

class LMLTagParser {
    constructor() {
        this.executor = new LMLExecutor();
    };

    parseLML(ctx, block) {
        let line = block.text.trim();
        if (line) {
            this.executor.execute(ctx, line);
        }
    };

    // Sync
    parseLib(ctx, block) {
        let libs = block.text.split(';');
        for (var i = 0; i < libs.length; i++) {
            let libname = libs[i].trim();
            if (lmllib.isRegistered(libname)) {
                ctx.lib[libname] = lmllib.pulloutLib(libname, ctx);
            } else {
                log('LML', 'Tried to inblude unregistered library : ' + libname, 'warn');
            }
        }
    };

    parseLive(ctx, block) {
        let flags = block.flags;
        let line = block.text.trim();
        let params = {};

        if (line.indexOf('(') != -1) {
            let matches = line.substring(line.indexOf('(') + 1, line.indexOf(')')).split(',');
            for (let i = 0; i < matches.length; i++) {
                let param = matches[i].split(':');
                let val = param[1].replace(/"/g, '').replace(/'/g, '');
                params[param[0]] = val[0] == "=" ? ctx.slang.getReturn(ctx, val.substring(1)) : val;
            }

            line = line.substring(0, line.indexOf('('));
        }

        let baseString = '<lml:livevars data-varname="' + line +
                         '" data-varparam="' + JSON.stringify(params).replace(/\"/g, "&lmlquote;") + '" ';

        for (let paramname in params) {
            baseString += ' data-' + paramname + '="'+params[paramname]+'" ';
        }

        return baseString + "></lml:livevars>"; 
    };

    // Async
    parseInclude(ctx, block, done) {
        let petals = block.text.trim().split(';');
        let petalIndex = -1;

        let nextPetal = () => {
            petalIndex++;
            if (petalIndex == petals.length) {
                done();
            } else {
                let petalname = petals[petalIndex];
                let fullpath = "";
                let toCompile = true;
                let flags = block.flags;

                if (flags["="]) {
                    petalname = ctx.slang.getReturn(ctx, petalname);
                }

                if (flags["%"]) {
                    toCompile = false;
                    fullpath = petalname;
                } else if (Petals.isRegistered(petalname)) {
                    fullpath = Petals.get(petalname).filepath;
                } else {
                    fullpath = ctx.extra.rootDir + "/" + petalname + ".petal";
                }

                if (toCompile) {
                    fileserver.readFile(fullpath, (ctn) => {
                        if (!ctn) {
                            ctx.stream.write(new Error("[LMLPetalExceltion] Undefined content for file " + fullpath).toString());
                            return nextPetal();
                        }

                        const compiler = new LMLCompiler();
                        ctx.store(ctn, {}, () => {
                            ctx.restore();
                            nextPetal();
                        });
    
                        compiler.deal(ctx);
                    }, false, 'utf8');
                } else {
                    fullpath = ctx.slang.getReturn(ctx, petalname);
                    fileserver.readFile(fullpath, (ctn) => {
                        ctx.stream.write(typeof ctn == "undefined" ? new Error("[LMLPetalException] Undefined content for file " + fullpath) : ctn, 'utf8', nextPetal);
                    }, false, 'utf8');
                }
            }
        };

        nextPetal();
    };
}

class LMLCompiler {
    constructor() {
        this.tagparser = new LMLTagParser();
    };

    output(ctx, str) {
        ctx.buffer.push(str.toString());
        if (!ctx.flags.writing) {
            ctx.flags.writing = true;
            let nextBlock = () => {
                if (ctx.buffer.length != 0) {
                    ctx.stream.write(ctx.buffer.shift(), 'utf8', nextBlock);
                } else {
                    ctx.flags.writing = false;
                    this.checkForCompletion(ctx);
                }
            }

            nextBlock();
        }
    }; 

    checkForCompletion(ctx) {
        if (ctx.flags.finished && !ctx.flags.writing && ctx.buffer.length == 0 && !ctx.flags.closed) {
            ctx.flags.closed = true;
            ctx.done && ctx.done(ctx);
        }
    };

    parseSingle(block, ctx, done) {
        if (!ctx.flags.skipping) {
            switch (block.type) {
                case "plain":
                    this.output(ctx, block.text);
                    return done();

                case "=":
                    this.output(ctx, ctx.slang.getReturn(ctx, block.text, block.flags));
                    return done();

                case "#":
                    this.tagparser.parseLib(ctx, block);
                    return done();

                case "%":
                    return this.tagparser.parseInclude(ctx, block, done);
    
                case "*":
                    this.output(ctx, this.tagparser.parseLive(ctx, block));
                    return done();
            }
        }

        if (block.type == "lml") {
            this.tagparser.parseLML(ctx, block);
        }

        return done();
    };

    parseBlocks(ctx) {
        let now = new Date();
        let nextBlock = () => {
            ctx.blockIndex++;
            if (ctx.blocks.length == ctx.blockIndex) {
                ctx.flags.finished = true;
                this.checkForCompletion(ctx);
            } else {
                let cBlock = ctx.blocks[ctx.blockIndex];
                let diff = new Date() - now;

                now = new Date(); 
                setTimeout(() => {
                    this.parseSingle(cBlock, ctx, nextBlock);
                }, 0);
            }
        };

        nextBlock();
    };

    findOpenings(ctx) {
        let openings = [];
        let nextPos = ctx.s.indexOf(opChar);

        while (nextPos != -1) {
            openings.push(nextPos);
            nextPos = ctx.s.indexOf(opChar, nextPos+1);
        }

        if (openings.length == 0) {
            return ctx.blocks.push({
                type : "plain",
                text : ctx.s
            });
        }

        let closureAt = -1;
        let inExec = false;
        for (let i = 0; i < openings.length; i++) {
            let cPos = openings[i] + 1;
            let oPos = openings[i];
            let xFlags = {};

            let ftc = ctx.s[cPos];
            switch (ftc) {
                case "=": case "%": case "#": case "*": 
                    cPos++;
                    while (ctx.s[cPos] == "?" || ctx.s[cPos] == "&" || ctx.s[cPos] == "%" || ctx.s[cPos] == "=") {
                        xFlags[ctx.s[cPos]] = true;
                        cPos++;
                    }
                    break;
                case "$": 
                    cPos++;
                    inExec = true; 
                    break;
                default: 
                    continue;
            }

            let filling = ctx.s.substring(closureAt, oPos);
            if (filling) {
                ctx.blocks.push({
                    type : "plain",
                    text : filling
                });
            }

            if (!inExec) {
                let potentialClosure = ctx.s.indexOf(clChar, cPos);
                let virtualOpening = cPos + 0;
                while (ctx.s.substring(virtualOpening, potentialClosure).indexOf(opChar) != -1) {
                    virtualOpening = potentialClosure+1;
                    potentialClosure = ctx.s.indexOf(clChar, virtualOpening);
                }

                ctx.blocks.push({
                    type : ftc,
                    text : ctx.s.substring(cPos, potentialClosure).trim(),
                    flags : xFlags
                });
                
                closureAt = potentialClosure + 1;
            } else {
                let closure = ctx.s.indexOf("$" + clChar, cPos);
                let commands = ctx.s.substring(cPos, closure).trim().split(';');

                for (var j = 0; j < commands.length; j++) if (commands[j].trim()) {
                    ctx.blocks.push({
                        type : "lml",
                        text : commands[j].trim()
                    });
                }

                closureAt = closure + 2;
            }

            inExec = false;
        }

        ctx.blocks.push({
            type : "plain",
            text : ctx.s.substring(closureAt)
        })
    };

    deal(ctx) {
        this.findOpenings(ctx);
        this.parseBlocks(ctx);
    };

    compileToFile(lmlfile, savepath, cb, extra) {
        let that = this;
        fileserver.readFile(lmlfile, function(content) {
            extra = extra || {};
            extra.rootDir = lmlfile.substring(0, lmlfile.lastIndexOf('/'));

            fileserver.createDirIfNotExists(savepath, function() {
                const stream = fileserver.getOutputFileHandle(savepath, 'w+');
                log('LML2', 'Compiling file ' + lmlfile, 'info');
                let now = new Date();
                that.compile(extra.config.id, content, stream, extra, () => {
                    log('LML2', 'Compiled file to ' + savepath + " in " + (new Date - now) + "ms", "success");
                    if (extra.minify) {
                        fileserver.minifyHTML(savepath, cb);
                    } else {
                        cb && cb();
                    }
                });
            });
        });
    };

    compile(siteid, string, stream, extra, cb) {
        const conf = configs.fetchConfig(siteid);
        let now = new Date();
        let ctx = new LMLContext(conf, string, stream, extra, () => {
            cb && cb.apply(this, [ctx]);
        });

        this.deal(ctx);
    };
};

module.exports = new LMLCompiler();
