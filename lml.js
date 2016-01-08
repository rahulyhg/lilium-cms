var LMLContext = require('./lmlcontext.js');
var fileserver = require('./fileserver.js');
var _c = require('./config.js');
var log = require('./log.js');

var LML = function() {
	// Reference to self
	var that = this, lml = this;

	// Print, execute, live, include, context
	var markSymbolOpen  = '{';
	var markSymbolClose = '}';
	var slangOpening = 'lml';

	/*
		Tag identifier -
			= Variable
			@ Code
			* Live
			% File
			# Context

		LML slang -
			{$ if (condition) $}
				Included text
			{$ endif $}

	*/

	var symbols = ['=', '@', '*', '%', '#', '$'];
	var symbolLen = symbols.length;
	var condIdentifiers = ["if", "while", "for"];
	var condClosures = ["endif", "else", "endwhile", "for"];

	var execVariableTag = function(context, code, callback) {
		// Browse the context library for corresponding obhect;
		var levels = code.split('.');
		var firstLevelLib = undefined;
		var endVal = undefined;

		try {
			var useSlang = typeof context.slangContext[levels[0]] !== 'undefined';
			if (useSlang || levels.length > 1) {
				firstLevelLib = useSlang ?
					context.slangContext[levels[0]] :
					context.lib[levels[0]];

				if (!useSlang && typeof firstLevelLib === 'undefined') {
					throw "LMLParseException - Undefined root level context library or LML slang : " + levels[0];
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
								curLevel.indexOf('(')+1,
								curLevel.indexOf(')') - curLevel.indexOf('(') -1
							).split(',').map(function(str) {
								str = str.trim();
								return (!isNaN(str)) ? parseInt(str) : str.replace(/'|"/g, '');
							});

							endVal = endVal[ftcName].apply(firstLevelLib, params);
						} else {
							throw "LMLParseException - Call to undefined funtion : " + ftcName;
						}
					} else {
						endVal = endVal[levels[i]];
					}

					if (typeof endVal === 'undefined') {
                	                	throw "LMLParseException - Undefined branch " +
							levels[i] + " in " + (useSlang?"LML Slang":"context library") + " : " +
							levels[0];
                       		 	}
				}
			} else if (code.trim() == "" || levels.length == 0) {
				throw "LMLParseException - Variable cannot be empty. Tried to read : '" + code + "'";
			} else {
				throw "LMLParseException - Cannot print root level of library '" + levels[0] + "', LML slang not found";
			}
		} catch (ex) {
			endVal = "[" + ex + "]";
		}

		context.newLine = endVal;
		callback();
		return true;
	};

	// WARNING : NOT SECURE
	var execCodeTag = function(context, code, callback) {
		// Execute code, not secure
		code = "(function(context) {" + code + "})(context);";
		try {
			eval(code);
			return true;
		} catch (ex) {
			throw "LMLParseException - Code Tag exception : " + ex;
		}

		callback();

		return false;
	};

	var execLiveTag = function(context, code, callback) {
		context.newLine = '<span class="liliumLiveVar" data-varname="'+code+'"></span>';
		callback();

		return true;
	};

	var execIncludeTag = function(context, code, callback) {
		var fullpath = context.rootDir + "/" + code + ".petal";
		that.executeToContext(fullpath, context, function(pContent) {
			if (typeof pContent !== 'undefined') {
				context.newLine += pContent;
			} else {
				context = context.parent;
				callback();
			}
		});

		return true;
	};

	var execContextTag = function(context, code, callback) {
		context.newLine = "";

		var codeArr = code.split(';');

		for (var i = 0, len = codeArr.length; i < len; i++) {
			context.loadLibrary(codeArr[i]);
		}

		callback();
		return true;
	};

	var LMLSlang = new (function() {
		this.validateClosure = function(condTag, closureTag) {
			var validClosure = (condTag == 'if' && closureTag == 'else' || closureTag == 'endif') ||
				(condTag == 'while' && closureTag == 'endwhile') ||
				(condTag == 'for' && closureTag == 'endfor');

			if (!validClosure) {
				throw "[LMLSlangException - Invalid closure] Found " + closureTag + " at the end of " +
					condTag + " block";
			}

			return validClosure;
		};

		this.pushToCondStack = function(context, split) {
			var condObj = {
				condTag : split[0],
				values : [split[1], split[3]],
				operator : split[2],
				seekingElse : false,
				requiredSkip : 0,
				content : [],
				subContext : new Object()
			};

			context.condStack.push(condObj);
			return condObj;
		};

		this.pulloutVar = function(context, str) {
			var endVal = str.trim();
			var isNumber = !isNaN(str);
			var isString = str.match(/^"(.*)"$/g);

			if (!isNumber) {

			} else {
				endVal = parseInt(str);
			}

			return endVal;
		};

		this.processCondition = function(context, condObj) {
			var firstVal = this.pulloutVar(condObj.values[0]);
			var compVal = this.pulloutVar(condObj.values[1]);
			var op = condObj.operator;



			// var truthfulness = op == "==";
		};

		this.processLoop = function(context, condObj) {

		};

		this.processEach = function(context, condObj) {

		};

		this.processOperation = function(context, opObj) {

		};
	})();

	var execLMLTag = function(context, code, callback) {
		// LML parsing
		var selector = /(if|while)[\s]*\([\s]*([^\s]+)[\s]*(==|<=?|>=?|!=)[\s]*([^\s]*)[\s]*\)|(for)[\s]*\([\s]*([^\s]+)[\s]+(in)[\s]+([^\s]+)[\s]*\)|(else|endif|endfor|endwhile)|([a-zA-Z0-9\.]+)[\s]*([\+|\-|\*|\/]=?|=)[\s]*([a-zA-Z0-9\.]+|["|'][^\n]+["|'])|\/\/([^\n]+)/g;
		var closureSelector = /(else|endif|endfor|endwhile)/g;

		// Split in lines array, all commands have
		var lines = code.split(/\n|;/g);
		for (var i = 0, max = lines.length; i < max; i++) {
			var line = lines[i].trim();
			if (line == "") continue;

			var match = line.match(selector);

			// Check for block opening or closure
			if (match.length > 0) {
				var split = match.split(selector).filter(function(str) {
					return str != undefined && str != "";
				});

				// If closure detected
				if (condClosures.indexOf(split[0]) != -1) {
					var curCond = context.condStack.pop();
					var closureTag = split[0];

					LMLSlang.validateClosure(curCond.condTag, closureTag);
				} else if (condIdentifiers.indexOf(split[0]) != -1) {
					var condObj = LMLSlang.pushToCondStack(context, split);

					// Process conditions
					switch (condObj.condTag) {
						case 'if' :
							LMLSlang.processCondition(context, condObj);
							break;

						case 'while':
							LMLSlang.processLoop(context, condObj);
							break;

						case 'for':
							LMLSland.processEach(context, condObj);
							break;
					}
				} else {

				}
			} else {
				// Nothing was found that matches LML Slang
			}
		}

		return true;
	};

	var execTagContent = function(context, callback) {
		var code = context.cachedCommand;
		var tag = context.currentInTag;

		switch (tag) {
			case "=" :
				return execVariableTag(context, code, callback);
				break;

			case "@" :
				return execCodeTag(context, code, callback);
				break;

			case "*" :
				return execLiveTag(context, code, callback);
				break;

			case "%" :
				return execIncludeTag(context, code, callback);
				break;

			case "#" :
				return execContextTag(context, code, callback);
				break;

			case "$" :
				return execLMLTag(context, code, callback);
				break;

			default :
				throw "LMLParseException - Error fetching current tag. Cached character is : " + tag;
		}

		return false;
	};

	var parseLine = function(line, context, lineCallback) {
		var i = 0, len = line.length;

		if (len == 0) {
			lineCallback();
			return;
		}

		var cont = function() {
			var c = line[i];

			if (context.tagProspect) {
				context.tagProspect = false;
				for (var j = 0; j < symbolLen; j++) {
					if (c == symbols[j]) {
						context.isInTag = true;
						context.currentInTag = symbols[j];

						context.isExecTag = c == '@';
						context.isLMLTag = c == '$';
						break;
					}
				}
			} else if (c == markSymbolOpen) {
				context.tagProspect = true;
			} else if (context.isInTag) {
				if (c == markSymbolClose && !context.isExecTag || (context.isExecTag && c == '@' && line[i+1] == markSymbolClose) || (context.isLMLTag && c == '$' && line[i+1] == markSymbolClose)) {
					if (context.isExecTag) {
						i++;
					}

					context.cachedCommand = context.cachedCommand.trim();
					context.skipNextChar = true;

					execTagContent(context, function() {
						context.compiled += context.newLine;

						context.isInTag = false;
						context.cachedCommand = '';
						context.isExecTag = false;
						context.newLine = '';

						cont();
					});

					return;
				} else {
					context.cachedCommand += c;
				}
			} else if (context.skipNextChar) {
				context.skipNextChar = false;
			} else {
				context.compiled += c;
			}

			i++;

			if (i == len) {
				lineCallback();
			} else {
				setTimeout(cont, 0);
			}
		};

		cont();
	};

	// Parses content, and returns partial strings through a callback
	// The value returned is undefined when everything is done
	this.parseContent = function(rootpath, content, callback, context) {
		// Per line execution, slow for minified files
		var lines = content.split('\n');
		var cLine = 0, lineTotal = lines.length;

		if (typeof context === 'undefined') {
			context = new LMLContext();
			context.rootDir = fileserver.dirname(rootpath);
		} else {
			var parentContext = context;
			context = new LMLContext();
			context.parent = parentContext;
			context.rootDir = fileserver.dirname(rootpath);
			context.lib = context.parent.lib;
		}

		delete content;

		if (lineTotal != 0) {
			var cont = function() {
				setTimeout(function() {
					parseLine(lines[cLine], context, function(feedback) {
						callback(context.compiled.toString());
						context.compiled = "";
						cLine++;

						if (cLine == lineTotal) {
							callback(undefined);
						} else {
							cont();
						}
					});
				}, 0);
			};
			cont();
		}
	};

	this.executeToContext = function(rootpath, context, callback) {
		fileserver.fileExists(rootpath, function(exists) {
			if (exists) {
				fileserver.readFile(rootpath, function(content) {
					that.parseContent(rootpath, content, function(pContent) {
						if (typeof pContent !== 'undefined') {
							callback(pContent.toString());
						} else {
							callback(undefined);
						}
					}, context);
				});
			} else {
				callback("[LMLIncludeNotFound : "+rootpath+"]");
				callback(undefined);
			}
		});
	};

	this.executeToFile = function(rootpath, compilepath, callback) {
		var timeStamp = new Date();
		fileserver.createDirIfNotExists(compilepath, function(dirExists) {
			if (!dirExists) throw "LML.AccessException - Could not create directory for " + compilepath;

			fileserver.readFile(rootpath, function(content) {
				var fileHandle = fileserver.getOutputFileHandle(compilepath);
				var linesToWrite = 0;
				var linesWritten = 0;
				var readyToFlush = false;
				var flushing = false;

				var verifyEnd = function() {
					if (readyToFlush && linesToWrite == linesWritten && !flushing) {
						flushing = true;
						fileserver.closeFileHandle(fileHandle);

						log('LML', 'Generated file : ' + compilepath + ' in ' + (new Date() - timeStamp) + 'ms');
						callback();
					}
				}

				that.parseContent(rootpath, content, function(pContent) {
					// Write pContent to file @compilepath
					if (typeof pContent === 'undefined') {
						readyToFlush = true;
						verifyEnd();
					} else {
						linesToWrite++;

						fileserver.writeToFile(fileHandle, pContent, function() {
							linesWritten++;
							verifyEnd();
						});
					}
				});
			});
		});
	}

	var init = function() {

	};

	init();
};

module.exports = new LML();
