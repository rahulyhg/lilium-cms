var AdminEndpoints = {
	GET : {},
	POST : {}
};

var AdminMenus = new Array();

var filelogic = require('../filelogic.js');
var formBuilder = require('../formBuilder');

var AdminMenu = function() {
	this.id = "";
	this.faicon = "";
	this.displayname = "";
	this.priority = -1;
	this.rights = new Array();
	this.absURL = "";
	this.children = new Array();
};

var Admin = function() {
	this.serveDashboard = function(cli) {
		cli.touch('admin.serverDashboard');

		if (cli.routeinfo.path.length == 1) {
			cli.redirect(cli._c.server.url + "/admin/dashboard", false);
		} else {
			this.handleAdminEndpoint(cli);
		}
	};

	this.handleGETDashboard = function(cli) {
		filelogic.serveAdminLML(cli);
	};

	this.serveLogin = function(cli) {
		cli.touch('admin.serverLogin');
		filelogic.runLogic(cli);
	};

	this.handleAdminEndpoint = function(cli) {
		cli.touch('admin.handleAdminEndpoint');

		if (this.adminEndpointRegistered(cli.routeinfo.path[1], cli.method)) {
			this.executeEndpoint(cli);
		} else {
			cli.throwHTTP(404, 'Unregistered Admin Endpoint : ' + cli.routeinfo.path[1]);
		}
	};

	this.createAdminMenuTemplate = function() {
		return new AdminMenu();
	};

	this.registerAdminMenu = function(adminmenu) {
		if (adminmenu.priority == -1) {
			return new Error("Admin Menu Priority not set");
		} else {
			while (typeof AdminMenus[adminmenu.priority] !== 'undefined') {
				adminmenu.priority++;
			}
			
			AdminMenus[adminmenu.priority] = adminmenu;
			return adminmenu;
		}
	};

	this.getAdminMenus = function() {
		return AdminMenus;
	};

	this.executeEndpoint = function(cli) {
		cli.touch('admin.executeEndpoint');
		AdminEndpoints[cli.method][cli.routeinfo.path[1]](cli);
	};

	this.adminEndpointRegistered = function(endpoint, method) {
		return (typeof AdminEndpoints[method][endpoint] !== 'undefined');
	};

	this.registerLiveVar = function() {
		var that = this;

		require('../livevars.js').registerLiveVariable('adminmenus', function(cli, levels, params, callback) {
			var sortedMenus = new Array();
			var menus = that.getAdminMenus();
			
			for (var index in menus) {
				sortedMenus.push(menus[index]);
			}

			callback(sortedMenus);
		});
	};

	this.registerAdminEndpoint = function(endpoint, method, func) {
		if (!this.adminEndpointRegistered(endpoint, method)) {
			AdminEndpoints[method][endpoint] = func;
		} else {
			throw "[AdminEndpointException] Endpoint is already registered : " + method + "@" + endpoint;
		}
	};

	var init = function() {

	};

	init();
};

module.exports = new Admin();
