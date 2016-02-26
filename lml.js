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

var LML = function() {
	// Reference to self
	var that = lml = thislml = this;

	// Print, execute, live, include, context
	var markSymbolOpen  = '{';
	var markSymbolClose = '}';
	var slangOpening = 'lml';

	var symbols = ['=', '*', '%', '#', '$'];
	var symbolLen = symbols.length;
	var condIdentifiers = ["if", "while", "for"];
	var condClosures = ["endif", "else", "endwhile", "endfor"];
	var lmlOperators = ["+=", "-=", "*=", "/=", "="];

	var execVariableTag = function(context, code, callback) {
		// Browse the context library for corresponding obhect;
		parseStringForRecursiveVarTags(context, code, function(code) {
			var endVal = LMLSlang.pulloutVar(context, code);

			context.newLine = endVal;
			callback();
		});

		return true;
	};

	var fetchLiveParams = function(paramsString) {
		var json = {};

		if (paramsString) {
			var reg = /([^:]*:[^,]*),?/g;
			var matches = null;

			while((matches = reg.exec(paramsString)) != null) {
				var str = matches[1];
				var key = str.substring(0, str.indexOf(':'));
				var val = str.substring(str.indexOf(':')+1).replace(/^\"|\"$/g, "");
					json[key] = val;
			}
		}

		return json;
	};

	var stringifyLiveParams = function(json) {
		return JSON.stringify(json).replace(/"/g, '&lmlquote;');
	};

	var execLiveTag = function(context, code, callback) {
		var params = fetchLiveParams(context.extra.livevarsParams);
		var templatename = params.template || "";
		var targetname = params.target || "";
		var sourceof = params.sourceof || "";

		parseStringForRecursiveVarTags(context, code, function(code) {
			context.newLine = '<lml:livevars data-varname="'+code+
				'" data-template="'+templatename+
				'" data-target="'+targetname+
				'" data-sourceof="'+sourceof+
				'" data-varparam="'+stringifyLiveParams(params)+'" ></lml:livevars>';

			callback();
		});

		return true;
	};

	var execIncludeTag = function(context, code, callback) {
		var split = code.split(';');
		var currentIndex = 0;

		var next = function() {
			if (currentIndex == split.length) {
				callback();
			} else {
				var fullpath = "";
				if (Petals.isRegistered(split[currentIndex])) {
					fullpath = Petals.get(split[currentIndex]).filepath;
				} else {
					fullpath = context.rootDir + "/" + split[currentIndex] + ".petal";
				}

				var includeBuffer = "";

				that.executeToContext(fullpath, context, function(pContent) {
					if (typeof pContent !== 'undefined') {
						includeBuffer += pContent;
					} else {
						context.merge();
						context.newLine += includeBuffer;
						currentIndex++;

						next();	
					}
				});
			}
		};
		next();

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

	var parseStringForRecursiveVarTags = function(context, code, callback) {
		var openingPos = code.indexOf('{=');
		var closingPos = code.lastIndexOf('}');
		var contentLength = closingPos - openingPos - 2;

		if (openingPos !== -1) {
			recursiveVariableTag(context, code.substring((openingPos+2), closingPos), function(replacedText) {
				callback(code.substring(0, openingPos) + replacedText + code.substring(closingPos + 1));
			});
		} else {
			callback(code);
		}
	};

	var recursiveVariableTag = function(context, code, callback) {
		var openingPos = code.indexOf('{=');
		var closingPos = code.lastIndexOf('}');
		var contentLength = closingPos - openingPos;

		if (openingPos !== -1) {
			recursiveVariableTag(context, code.substring(openingPos+2, closingPos), function(replacedText) {
				var newStr = code.substring(0, openingPos) + replacedText + code.substring(openingPos + contentLength + 1);
				var endVal = LMLSlang.pulloutVar(context, newStr);

				callback(endVal);
			});
		} else {
			var endVal = LMLSlang.pulloutVar(context, code);
			callback(endVal);
		}
	};

	var LMLSlang = new (function() {
		this.validateClosure = function(condTag, closureTag) {
			var validClosure = (condTag == 'if' && closureTag == 'else' || closureTag == 'endif') ||
				(condTag == 'while' && closureTag == 'endwhile') ||
				(condTag == 'for' && closureTag == 'endfor');

			if (!validClosure) {
				throw new Error("[LMLSlangException - Invalid closure] Found " + closureTag + " at the end of " +
					condTag + " block");
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
				subContext : new Object(),
				buffer : "",
				lineIndex : context.currentLineIndex,
				forIndex : -1
			};

			context.condStack.push(condObj);
			return condObj;
		};

		this.createOpObject = function(context, split) {
			var opObj = {
				op : split[1],
				values : [split[0],split[2]],
				subContext : new Object()
			};

			return opObj;
		};

		this.pulloutVar = function(context, str) {
			var endVal = str.trim();
			var isNumber = !isNaN(str);
			var isStringMatch = str.match(/^"(.*)"$|^'(.*)'$/g);

			if (isStringMatch) {
				endVal = str.trim().slice(1, -1);
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
										curLevel.indexOf('(')+1,
										curLevel.indexOf(')') - curLevel.indexOf('(') -1
									).split(',').map(function(str) {
										str = str.trim();
										return (!isNaN(str)) ? parseInt(str) : str.replace(/'|"/g, '');
									});

									endVal = endVal[ftcName].apply(firstLevelLib, params);
								} else {
									throw new Error("LMLParseException - Call to undefined funtion : " + ftcName);
								}
							} else {
								endVal = endVal[levels[i]];
							}

							if (typeof endVal === 'undefined') {
                			                	throw new Error("LMLParseException - Undefined branch " +
									levels[i] + " in " + (useSlang?"LML Slang":"context library") + " : " +
									levels[0]);
                       		 			}
						}
					} else if (str.trim() == "" || levels.length == 0) {
						throw new Error("LMLParseException - Variable cannot be empty. Tried to read : '" + str + "'");
					} else {
						throw new Error("LMLParseException - Cannot print root level of library '" + levels[0] + "', LML slang not found");
					}
				} catch (ex) {
					endVal = "[" + ex + "]";
				}
			} else {
				endVal = parseInt(str);
			}

			return endVal;
		};

		this.compare = function(val1, val2, op) {
			if (typeof val1 === 'object' && typeof val2 === 'object') {
				var condObj = val1;
				var firstVal = this.pulloutVar(val2, condObj.values[0]);
				var compVal = this.pulloutVar(val2, condObj.values[1]);
				op = condObj.operator;

				val2 = compVal;
				val1 = firstVal;
			}

			switch (op) {
				case "==": return val1 == val2;
				case ">" : return val1 >  val2;
				case "<" : return val1 <  val2;
				case ">=": return val1 >= val2;
				case "<=": return val1 <= val2;
				case "!=": return val1 != val2;
			};
		};

		this.affect = function(context, varName, value) {
			var levels = varName.split('.');
			var currentLvl = context.slangContext;

			for (var i = 0; i < levels.length-1; i++) {
				if (typeof currentLvl[levels[i]] !== 'object') {
					currentLvl[levels[i]] = new Object();
				}
				currentLvl = currentLvl[levels[i]];
			}

			currentLvl[levels[levels.length-1]] = value;
			return value;
		};

		this.processCondition = function(context, condObj) {
			var firstVal = this.pulloutVar(context, condObj.values[0]);
			var compVal = this.pulloutVar(context, condObj.values[1]);
			var op = condObj.operator;

			var truthfulness = this.compare(firstVal, compVal, op);
			context.skipUntilClosure = !truthfulness;

			return truthfulness;
		}

		this.processLoop = function(context, condObj) {
			context.storeUntilClosure = true;
			return true;
		};

		this.processOperation = function(context, opObj) {
			var affectedName = opObj.values[0];
			var affectedValue = this.pulloutVar(context, affectedName);
			var effect = this.pulloutVar(context, opObj.values[1]);

			switch (opObj.op) {
				case "=" :  return this.affect(context, affectedName, effect);
				case "+=" : return this.affect(context, affectedName, affectedValue + effect);
				case "-=" : return this.affect(context, affectedName, affectedValue - effect);
				case "*=" : return this.affect(context, affectedName, affectedValue * effect);
				case "/=" : return this.affect(context, affectedName, affectedValue / effect);
			}
		};

		this.processForLoop = function(context, condObj) {
			var affectedName = condObj.values[0];
			var _arr = this.pulloutVar(context, condObj.values[1]);

			condObj.forIndex++;
			if (_arr.length == 0 || condObj.forIndex >= _arr.length) {
				context.skipUntilClosure = true;
			} else {
				this.affect(context, affectedName, _arr[condObj.forIndex]);
			}
		};
	})();

	var execLMLTag = function(context, code, callback) {
		// LML parsing
		var selector = /(if|while)[\s]*\([\s]*([^\s]+)[\s]*(==|<=?|>=?|!=)[\s]*([^\n]*)[\s]*\)|(for)[\s]*\([\s]*([^\s]+)[\s]+(in)[\s]+([^\s]+)[\s]*\)|(else|endif|endfor|endwhile)|([a-zA-Z0-9\.]+)[\s]*([\+|\-|\*|\/]=?|=)[\s]*([a-zA-Z0-9\.]+[\s]*(\(.*\))?|["|'][^\n]+["|'])|\/\/([^\n]+)|([a-zA-Z0-9\.]+)[\s]*\((.*)\)/g;
		var closureSelector = /(else|endif|endfor|endwhile)/g;

		// Split in lines array, all commands have
		var lines = typeof code === 'string' ? code.split(/\n|;/g) : code;
		var lineNumber = 0;
		var maxLine = lines.length;

		var handleLMLLine = function() {
			var line = lines[lineNumber].trim();

			if (line != "") {
				var match = line.match(selector);

				// Check for block opening or closure
				if (match && match.length > 0) {
					match = match[0];
					var split = match.split(selector).filter(function(str) {
						return str != undefined && str != "";
					});

					// If closure detected
					if (condClosures.indexOf(split[0]) != -1) {
						var curCond = context.condStack.pop();
						var closureTag = split[0];

						LMLSlang.validateClosure(curCond.condTag, closureTag);
						if (curCond.requiredSkip > 0) {
							curCond.requiredSkip--;
						} else {
							context.currentBlock = (context.condStack.length == 0) ?
								"lml" :
								context.condStack[context.condStack.length-1].condTag;

							if (split[0] == 'else') {
								context.skipUntilClosure = !context.skipUntilClosure;
								context.condStack.push(curCond);
							} else {
								if (curCond.condTag == 'while' || curCond.condTag == 'for') {
									if (!context.skipUntilClosure) {
										context.lineFeedback.jumpTo = curCond.lineIndex;
										context.condStack.push(curCond);
										context.temp.looping = true;
									} else {
										context.temp.looping = false;
									}
								}

								context.storeUntilClosure = false;
								context.skipUntilClosure = false;
							}
						}
					} else if (condIdentifiers.indexOf(split[0]) != -1) {
						if (context.skipUntilClosure) {
							context.condStack[context.condStack.length-1].requiredSkip++;
						} else {
							var condObj = undefined;
 							if (context.temp.looping) {
								condObj = context.condStack[context.condStack.length-1];
								context.temp.looping = false;
							} else {
								condObj = LMLSlang.pushToCondStack(context, split);
							}

							context.currentBlock = condObj.condTag;

							// Process conditions
							switch (condObj.condTag) {
								case 'if' :
								case 'while':
									LMLSlang.processCondition(context, condObj);
									break;

								case 'for' :
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
					" in " + (context.rootPath||"LML file") +
					" @ line " + context.currentLineIndex);
				log("Stacktrace", ex.stack);
				throw new Error("[Fatal] [LMLParserException] Could not recover from fatal error");
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
				throw new Error("LMLParseException - Error fetching current tag. Cached character is : " + tag);
		}

		return false;
	};

	// Content of line should be trimmedd
	var parseLine = function(line, context, lineCallback) {
		line = line.trim();
		if (line.length == 0) {
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
		var lmlDetectRegex = /{(#|%|=)([^\n\s]*)}|({[\$|@]|[\$|@]})|{(\*)([^\n\s\(]*)\(?(([^\n\s]*\s*:\s*"?[A-Za-z0-9À-ÿ\_\#\>\<\/\=\+\-.\s\']*"?,?\s*)*)\)?}/g;
		var seekLML = function() {
			if (nextWorkPos >= line.length) {
				lineCallback(context.lineFeedback);
			} else if (context.isLMLTag) {
				context.currentInTag = "$";
				var crop = line.substring(nextWorkPos);

				nextWorkPos += crop.length;
				if (crop.indexOf('$}') != -1) {
					crop = crop.substring(0, crop.indexOf('{$'));
					context.isLMLTag = false;
				}

				context.cachedCommand = crop;

				execTagContent(context, function() {
					context.compiled += context.newLine;
					context.newLine = "";

					setTimeout(seekLML, 0);
				});
			} else if (context.skipUntilClosure) {
				var ind = line.indexOf('{$');
				if (ind != -1) {
					context.isLMLTag = true;
					nextWorkPos = ind + 2;
				} else {
					nextWorkPos = line.length;
				}

				setTimeout(seekLML, 0);
			} else if ((lmlMatch = lmlDetectRegex.exec(line)) != null) {
				detectPos = lmlMatch.index;
				detectLength = lmlMatch[0].length;

				if (typeof lmlMatch[1] !== 'undefined' || typeof lmlMatch[4] !== "undefined") {
					var cropLength = detectPos - nextWorkPos;
					var comp = line.substring(nextWorkPos).substring(0, cropLength);

					context.compiled += comp;
					context.currentInTag = lmlMatch[1] || lmlMatch[4];
					context.cachedCommand = lmlMatch[2] || lmlMatch[5];
					context.extra.livevarsParams = lmlMatch[6];

					nextWorkPos = detectPos + detectLength;
					execTagContent(context, function() {
						context.compiled += context.newLine;
						context.newLine = "";

						setTimeout(seekLML, 0);
					});
				} else {
					// Is LML opening or EXEC tag
					context.isLMLTag = true;
					nextWorkPos = detectPos + detectLength;
					setTimeout(seekLML, 0);
				}
			} else {
				context.compiled += line.substring(nextWorkPos) + "\n";
				lineCallback(context.lineFeedback);
			}
		};

		setTimeout(seekLML, 0);
	};

	// Parses content, and returns partial strings through a callback
	// The value returned is undefined when everything is done
	this.parseContent = function(rootpath, content, callback, context, extra) {
		// Per line execution, slow for minified files
		var lines = typeof content === 'string' ? content.split('\n') : typeof content === 'object' ? content : new Array();
		var cLine = 0, lineTotal = lines.length;

		if (typeof context === 'undefined') {
			context = new LMLContext();
			context.rootDir = fileserver.dirname(rootpath);
		} else {
			context.stash();
		}

		if (typeof extra !== 'undefined') {
			context.extra = extra;
		}

		delete content;

		if (lineTotal != 0) {
			var cont = function() {
				setTimeout(function() {
					parseLine(lines[cLine], context, function(feedback) {
						if (feedback) {
							if (typeof feedback.jumpTo !== 'undefined') {
								cLine = feedback.jumpTo;
								feedback.jumpTo = undefined;
							}
						}

						context.currentLineIndex = cLine;
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
		} else {
			setTimeout(function() { callback(undefined); }, 0);
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

	this.executeToHtml = function(rootpath, callback, extra) {
		var timeStamp = new Date();
		var html = "";

		fileserver.readFile(rootpath, function(content) {
			var linesToWrite = 0;
			var linesWritten = 0;
			var readyToFlush = false;
			var flushing = false;

			var verifyEnd = function() {
				if (readyToFlush && linesToWrite == linesWritten && !flushing) {
					flushing = true;

					log('LML', 'Compiled File : ' + rootpath + ' in ' + (new Date() - timeStamp) + 'ms');

					callback(html);
				}
			}

			that.parseContent(rootpath, content, function(pContent) {
				// Write pContent to file @compilepath
				if (typeof pContent === 'undefined') {
					readyToFlush = true;
					verifyEnd();
				} else {
					linesToWrite++;
					html += pContent;
					linesWritten++;
					verifyEnd();
				}
			}, undefined, extra);
		});
	}

	this.executeToFile = function(rootpath, compilepath, callback, extra) {
		var timeStamp = new Date();
		fileserver.createDirIfNotExists(compilepath, function(dirExists) {
			if (!dirExists) throw new Error("LML.AccessException - Could not create directory for " + compilepath);

			fileserver.readFile(rootpath, function(content) {
				var fileHandle = fileserver.getOutputFileHandle(compilepath, 'w+');
				var linesToWrite = 0;
				var linesWritten = 0;
				var readyToFlush = false;
				var flushing = false;

				var verifyEnd = function() {
					if (readyToFlush && linesToWrite == linesWritten && !flushing) {
						flushing = true;
						fileserver.closeFileHandle(fileHandle);

						log('LML', 'Generated file : ' + compilepath + ' in ' + (new Date() - timeStamp) + 'ms');
						if (_c.default.env == 'prod') {
							fileserver.minifyHTML(compilepath, callback);
						} else {
							callback();
						}
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
				}, undefined, extra);
			});
		});
	}

	var init = function() {

	};

	init();
};

module.exports = new LML();
