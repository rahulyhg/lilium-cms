// LML Context Object Namespace

var registeredLibraries = {
	config : function(context) {
		return require('./config.js');
	},
	vocab : function(context) {
		return require('./vocab.js');
	},
	session : function(context) {
		return "";
	}
};

var LMLContext = function(info) {
	this.tagProspect = false;
	this.isInTag = false;
	this.isExecTag = false;
	
	this.currentInTag = '';
	this.cachedCommand = '';
	this.compiled = '';
	this.newLine = '';

	this.lib = {
		_public : new Object()
	};
	this.pub = this.lib.pub = this.lib._public; // Alias for public, local context variables

	this.loadLibrary = function(libName) {
		if (typeof registeredLibraries[libName] === 'undefined') {
			throw "LMLParseException - Unable to add unregistered library '"+libName+"' to current context";
		}

		if (typeof lib[libNam] !== "undefined") {
			throw "LMLParseException - Attempted to add already registered library '"+libName+"' to context";
		}

		lib[libName] = registeredLibraries[libName](this);
	};

	var init = function(info) {
		// Store current context information
	};

	if (typeof info !== 'undefined') {
		init(info);
	}
};

module.exports = LMLContext;
