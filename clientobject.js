var entities = require('./entities.js');

var ClientObject = function(req, resp) {
	this.request = req;
	this.response = resp;
	this.session = req.session;
	this.sessiondata = req.session.data;
	this.method = req.method;
	this.createdon = new Date();
	this.postdata = undefined;
	this.nodes = ['clientobject.new'];

	this.userinfo = {
		loggedin : req.session.data.user != 'Guest',
		roles : req.session.data.roles,
		userid : req.session.data._id,
		logintime : req.session.data.logintime,
		displayname : req.session.data.displayname,
		admin : req.session.data.admin,
		god : req.session.data.god,
		user : req.session.data.user,
	};

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
		"Content-Type": "application/json",
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

ClientObject.prototype.isLoggedIn = function () {
	return this.userinfo.loggedin;
}

ClientObject.prototype.redirect = function(path, perm) {
	this.response.writeHead(perm?301:302, {
		'Location' : path
	});
	this.response.end();
};

module.exports = ClientObject;
