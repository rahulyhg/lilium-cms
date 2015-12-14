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

	/*
		Tag identifier - 
			= Variable
			@ Code
			* Live
			% File
			# Context 
	*/
	var symbols = ['=', '@', '*', '%', '#'];
	var symbolLen = symbols.length;

	var execVariableTag = function(context, code, callback) {
		// Browse the context library for corresponding obhect;
		var lib = context.lib;
		var levels = code.split('.');
		var firstLevelLib = undefined;
		var endVal = undefined;

		try {
			if (levels.length != 0) {
				firstLevelLib = lib[levels[0]];
	
				if (typeof firstLevelLib === 'undefined') {
					throw "LMLParseException - Undefined root level context library : " + levels[0];
				} 

				// Go through all levels
				endVal = firstLevelLib;
				for (var i = 1, len = levels.length; i < len; i++) {
					endVal = endVal[levels[i]];
	
					if (typeof endVal === 'undefined') {
                	                	throw "LMLParseException - Undefined branch " + 
							levels[i] + " in context library : " + 
							levels[0];
                       		 	}	 
				}
			} else {
				throw "LMLParseException - Cannot print root level of library : " + levels[0];
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

	// Not implemented yet
	var execLiveTag = function(context, code, callback) {
		execVariableTag(context, code, callback);
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
						break;
					}
				}
			} else if (c == markSymbolOpen) {
				context.tagProspect = true;
			} else if (context.isInTag) {
				if (c == markSymbolClose && !context.isExecTag || (context.isExecTag && c == '@' && line[i+1] == markSymbolClose)) {
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
