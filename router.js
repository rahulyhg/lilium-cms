var url = require('url');
var _c = require('./config.js');

var Router = function() {
	this.parseClientObject = function(cli) {
		pObj = url.parse(cli.request.url, true);
		
		cli.routeinfo.path = pObj.pathname.replace(/^\/?|\/?$/g, "").split('/');
		cli.routeinfo.params = pObj.query;
		cli.routeinfo.admin = cli.routeinfo.path.length != 0 && cli.routeinfo.path[0] === _c.default.paths.admin;
		cli.routeinfo.login = cli.routeinfo.path.length != 0 && cli.routeinfo.path[0] === _c.default.paths.login;
		cli.routeinfo.root = pObj.pathname == "/";
	};	
	
	var init = function() {

	};

	init();
};

module.exports = new Router();
