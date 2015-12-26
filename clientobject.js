var ClientObject = function(req, resp) {
	this.request = req;
	this.response = resp;
	this.session = req.session;
	this.sessiondata = req.session.data;
	this.method = req.method;
	this.createdon = new Date();

	var nodes = ['clientobject.new'];

	this.throwHTTP = function(code, message) {
		this.response.writeHead(code, {
			'content-type': 'text/plain'
		});
		
		if (typeof message !== "undefined") {
			this.response.write(message);
		}	

		this.response.end();
	};

	this.userinfo = {
		loggedin : req.session.data.user != 'Guest',
		role : req.session.data.role,
		userid : req.session.data.userid,
		logintime : req.session.data.logintime,
		level : req.session.data.level,
		displayname : req.session.data.displayname,
		avatar : req.session.data.avatar,
		admin : req.session.data.admin,
		god : req.session.data.god,
		user : req.session.data.user,
	};
	this.userinfo.dashaccess = 
		this.userinfo.loggedin &&
		this.userinfo.admin || 
		this.userinfo.god || 
		(this.userinfo.role && this.userinfo.role.indexOf('dash') !== -1);

	this.routeinfo = {
		admin : false,
		login : false,
		root : false,
		isStatic : false,
		params : [],
		path : [],
		fullpath : "",
		fileExt : ""
	};

	this.responseinfo = {
		filecreated : false,
		cachedfile : false
	};

	this.debug = function() {
		this.response.writeHead(200);
		this.response.write(JSON.stringify({
			routeinfo : this.routeinfo,
			userinfo : this.userinfo,
			responseinfo : this.responseinfo,
			method : this.method,
			postdata : this.postdata,
			nodes : nodes,
			time : {
				created : this.createdon,
				served : new Date()
			}
		}));
		this.response.end();
	};

	this.touch = function(str) {
		nodes.push(str);
	};

	this.redirect = function(path, perm) {
		this.response.writeHead(perm?302:301, {
			'Location' : path
		});
		this.response.end();
	};

	this.postdata = undefined;
};

module.exports = ClientObject;
