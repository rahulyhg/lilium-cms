// var FormBuilder = require('./formBuilder.js');

// LML Context Object Namespace
// Those will be loaded runtime instead of on boot
var registeredLibraries = {
	config : function(context) {
		return require('./config.js');
	},
	vocab : function(context) {
		return require('./vocab.js');
	},
	session : function(context) {
		return "";
	},
	forms : function(context) {
		return FormBuilder;
	}
};

var LMLContext = function(info) {
	this.tagProspect = false;
	this.isInTag = false;
	this.isExecTag = false;
	this.isLMLTag = false;
	
	this.currentInTag = '';
	this.cachedCommand = '';
	this.compiled = '';
	this.newLine = '';
	this.skipNextChar = false;
	this.rootDir = '';

	// Contains : {condTag:"if|while|for", values:[val1, val2], operator:"==|<=|>=|!="}
	this.condStack = [];
	this.currentBlock = "lml";
	this.skipUntilClosure = false;

	this.touched = ["LMLContext.init"];
	
	this.lib = {
		_public : new Object()
	};
	this.pub = this.lib.pub = this.lib._public; // Alias for public, local context variables
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

	this.touch = function(str) {
		this.touched.push(str);
	};

	var init = function(info) {
		// Store current context information
	};

	if (typeof info !== 'undefined') {
		init(info);
	}
};

module.exports = LMLContext;
