var url = require('url');
var pathlib = require('path');
var session = require('./session.js');
var _c = require('./config.js');

var Router = function() {
	this.parseClientObject = function(cli) {
		cli.touch('router.parseClientObject');

		pObj = url.parse(cli.request.url, true);
		cli.routeinfo.fileExt = pathlib.extname(pObj.pathname);
		cli.routeinfo.isStatic = cli.routeinfo.fileExt !== '';

		cli.routeinfo.fullpath = pObj.pathname[pObj.pathname.length-1] == '/' ?
			pObj.pathname.substr(0, pObj.pathname.length-1) :
			pObj.pathname;

		cli.routeinfo.path = pObj.pathname.replace(/^\/?|\/?$/g, "").split('/');
		cli.routeinfo.params = pObj.query;
		cli.routeinfo.admin = cli.routeinfo.path.length != 0 && cli.routeinfo.path[0] === _c.default.paths.admin;
		cli.routeinfo.login = cli.routeinfo.path.length != 0 && cli.routeinfo.path[0] === _c.default.paths.login;
		cli.routeinfo.livevars = cli.routeinfo.path.length != 0 && cli.routeinfo.path[0] === _c.default.paths.livevars;
		cli.routeinfo.root = pObj.pathname == "/";

		if (!cli.routeinfo.isStatic) {
			session.injectSessionInCli(cli);
		};
	};

	var init = function() {

	};

	init();
};

module.exports = new Router();
