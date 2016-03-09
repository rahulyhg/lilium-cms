var entities = require('./entities.js');
var log = require('./log.js');

var ClientObject = function(req, resp) {
	this.request = req;
	this.response = resp;
	this.method = req.method;
	this.createdon = new Date();
	this.postdata = undefined;
	this.nodes = ['clientobject.new'];
	this.cookies = new Object();
	this.session = new Object();
	this.userinfo = new Object();
	this._c = undefined;

	this.routeinfo = {
		admin : false,
		login : false,
		livevars : false,
		root : false,
		isStatic : false,
		params : [],
		path : [],
		fullpath : "",
		fileExt : ""
	};
	this.userinfo.dashaccess =
		this.userinfo.loggedin &&
		this.userinfo.admin ||
		this.userinfo.god ||
		entities.isAllowed(this.userinfo, 'dash');

	this.responseinfo = {
		filecreated : false,
		cachedfile : false
	};

	this.parseCookie();
};
ClientObject.prototype.throwHTTP = function(code, message) {
	this.responseinfo.httpcode = code;
	this.responseinfo.httpmessage = message;
	this.debug();
};

ClientObject.prototype.debug = function() {
	this.response.writeHead(200);
	this.response.write(JSON.stringify({
		routeinfo : this.routeinfo,
		userinfo : this.userinfo,
		responseinfo : this.responseinfo,
		method : this.method,
		postdata : this.postdata,
		nodes : this.nodes,
		time : {
			created : this.createdon,
			served : new Date()
		}
	}));
	this.response.end();
};

ClientObject.prototype.sendJSON = function(json) {
	if (typeof json === 'object') {
		json = JSON.stringify(json);
	}
	this.response.writeHead(200, {
		"Content-Type": "application/json; charset=utf-8",
		"Lilium-Proto": "livevars"
	});

	this.response.end(json);
};

ClientObject.prototype.touch = function(str) {
	this.nodes.push(str);
};

ClientObject.prototype.isGranted = function (role) {
	var isGranted = false;
		if (typeof this.userinfo.roles !== 'undefined' && (
			this.userinfo.roles.indexOf('lilium') != -1 ||
			this.userinfo.roles.indexOf('admin') != -1 ||
			this.userinfo.roles.indexOf(role) != -1)){
				isGranted = true;
		}
		return isGranted;
}

ClientObject.prototype.hasEnoughPermission = function (minimumRole) {
	// Check minimumRole power and check client maximumRole
}

ClientObject.prototype.isLoggedIn = function () {
	return this.userinfo.loggedin;
}

ClientObject.prototype.redirect = function(path, perm) {
	this.response.writeHead(perm?301:302, {
		'Location' : path
	});
	this.response.end();
};

ClientObject.prototype.crash = function(ex) {
	log('ClientObject', 'Crash handled with error : ' + ex);

	try {
		var errFilePath = this._c.server.base + "/backend/dynamic/error.lml";
		this.routeinfo.isStatic = true;

		require('./filelogic.js').executeLMLNoCache(this, errFilePath, ex);
	} catch (ex) {
		log('ClientObject', 'Could not handle crash : ' + ex);
		this.response.end();
	}
};

ClientObject.prototype.parseCookie = function() {
	var cookieString = this.request.headers.cookie;
	var that = this;

	if (cookieString) {
		cookieString.split(';').forEach(function(cookie) {
			var keyVal = cookie.split('=');
			var keyName = keyVal.shift().trim();
			keyVal = decodeURI(keyVal.join('=').trim());

			if (!that.cookies[keyName]) {
				that.cookies[keyName] = keyVal;
			} else if (that.cookies[keyName] === 'object') {
				that.cookies[keyName].push(keyVal);
			} else {
				var str = that.cookies[keyName];
				that.cookies[keyName] = [str, keyVal];
			}
		});
	}
};

module.exports = ClientObject;
