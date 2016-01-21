var FormBuilder = require('./formBuilder.js');

// LML Context Object Namespace
// Those will be loaded runtime instead of on boot
var registeredLibraries = {
	config : function(context) {
		return require('./config.js');
	},
	vocab : function(context) {
		return require('./vocab.js');
	},
	forms : function(context) {
		return FormBuilder;
	},
	article : function(context) {
		return require('./article.js');
	},
	plugins : function(context) {
		return require('./plugins.js');
	},
	testarray : function(context) {
		return ["Hi", ", ", "this ", "is ", "a ", " sentence", "."];
	},
	extra : function(context) {
		return context.extra;
	},
	debug : function(context) {
		return {
			printContext : function() {
				return JSON.stringify(context);
			},
			format : "json"
		};
	}
};

var LMLConstants = {
	"false" : false,
	"true" : true
}

var LMLContext = function(info) {
	this.touched = ["LMLContext.init"];

	this.lib = {
		_public : new Object()
	};
	this.extra = new Object();
	this.slangContext = new Object();

	this.loadLibrary = function(libName) {
		if (typeof registeredLibraries[libName] === 'undefined') {
			throw "LMLParseException - Unable to add unregistered library '"+libName+"' to current context";
		}

		if (typeof this.lib[libName] !== "undefined") {
			throw "LMLParseException - Attempted to add already registered library '"+libName+"' to context";
		}

		this.lib[libName] = registeredLibraries[libName](this);
	};

	this.states = [];
	this.stash = function() {
		this.states.push({
			tagProspect :       this.tagProspect,
			isInTag :           this.isInTag,
			isExecTag :         this.isExecTag,
			isLMLTag :          this.isLMLTag,
			storeBuffer : 	    this.storeBuffer,
			currentInTag :      this.currentInTag,
			cachedCommand :     this.cachedCommand,
			newLine :           this.newLine,
			skipNextChar :      this.skipNextChar,
			rootDir :           this.rootDir,
			rootPath :          this.rootPath,
			avoidParent :       this.avoidParent,
			lmlBlockThread :    this.lmlBlockThread,
			currentLineIndex :  this.currentLineIndex,
			condStack :         this.condStack,
			currentBlock :      this.currentBlock,
			skipUntilClosure :  this.skipUntilClosure,
			storeUntilClosure : this.storeUntilClosure,
			temp :		    this.temp
		});

		this.init();
	};

	this.merge = function() {
		if (this.states.length != 0) {
			var poped = this.states.pop();

			for (var k in poped) {
				this[k] = poped[k];
			};
		}
	};

	this.touch = function(str) {
		this.touched.push(str);
	};

	this.lineFeedback = new Object();
	this.init = function(info) {
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

		this.temp = new Object();
	};

	this.init();
};

module.exports = LMLContext;
