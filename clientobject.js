var ClientObject = function(req, resp) {
	this.request = req;
	this.response = resp;
	this.session = req.session;
	this.sessiondata = req.session.data;
	this.method = req.method;

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
		userid : req.session.data.id,
		logintime : req.session.data.logintime,
		level : req.session.data.level,
		displayname : req.session.data.displayname,
		avatar : req.session.data.avatar,
		dashaccess : false
	};

	this.routeinfo = {
		admin : false,
		root : false,
		params : [],
		path : []
	};

	this.debug = function() {
		this.response.writeHead(200);
		this.response.write(JSON.stringify({
			routeinfo : this.routeinfo,
			userinfo : this.userinfo,
			method : this.method,
			postdata : this.postdata
		}));
		this.response.end();
	};

	this.redirect = function(path, perm) {
		this.response.writeHead(perm?302:301, {
			'Location' : path
		});
		this.response.end();
	};

	this.postdata = {};
};

module.exports = ClientObject;
