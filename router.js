var url = require('url');
var pathlib = require('path');
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

		if (cli.method == "POST") {
			this.parsePostData(cli);
		}
	};

	this.parsePostData = function(cli) {
		cli.touch("router.parsePostData");

		var str = cli.postdata.data;
		var arr = str.split("&");
		cli.postdata.data = {};

		delete str;	
		for (var i = 0, len = arr.length; i < len; i++) {
			var dat = arr[i].split('=');
			cli.postdata.data[dat[0]] = dat.length > 1 ?
				decodeURIComponent(dat[1].replace(/\+/g, ' ')) :
				undefined;
		}
	};	
	
	var init = function() {

	};

	init();
};

module.exports = new Router();
