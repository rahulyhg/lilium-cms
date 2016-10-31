var AdminEndpoints = {
	GET : {},
	POST : {}
};

var AdminMenus = new Array();

var filelogic = require('../filelogic.js');
var formBuilder = require('../formBuilder');
var pluginHelper = require('../pluginHelper.js');
var hooks = require('../hooks.js');

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

    this.welcome = function(cli, method) {
        if (method == 'GET') {
            filelogic.serveLmlPage(cli, false);
        } else if (method == 'POST') {
            switch (cli.routeinfo.path[2]) {
                case "upload": require('../entities.js').uploadFirstAvatar(cli); break;
                case "finish": require('../entities.js').welcome(cli); break;
                default: cli.debug(); break;
            }
        } else {
            cli.debug();
        }
    };

	this.handleAdminEndpoint = function(cli) {
		cli.touch('admin.handleAdminEndpoint');
    
        if (cli.method === "GET" && !cli.routeinfo.params.async && cli.routeinfo.path[1] != "welcome") {
            filelogic.serveAdminTemplate(cli);
		} else if (this.adminEndpointRegistered(cli.routeinfo.path[1], cli.method)) {
			this.executeEndpoint(cli);
		} else {
            cli.did('request', '404', {url : cli.routeinfo.fullpath});
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

    this.registerAdminSubMenu = function(parentMenuId, adminmenu) {
        for (var index in AdminMenus) {
            if (AdminMenus[index].id && AdminMenus[index].id == parentMenuId) {
                if (adminmenu.priority == -1) {
                    return new Error("Admin Menu Priority not set");
                } else {
                    while (typeof AdminMenus[index].children[adminmenu.priority] !== 'undefined') {
                        adminmenu.priority++;
                    }
                    AdminMenus[index].children[adminmenu.priority] = adminmenu;
                    return adminmenu;
                }
                break;
            }
        }
    }

	this.getAdminMenus = function() {
		return AdminMenus;
	};

	this.executeEndpoint = function(cli) {
		cli.touch('admin.executeEndpoint');
        cli.did('request', 'admin', {'endpoint' : cli.routeinfo.fullpath});
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
                var subMenu = [];

                if (cli.hasRight(menus[index].rights)) {
                    var submenus = [];

                    for (var subindex in menus[index].children) {

                        if (menus[index].children[subindex] && cli.hasRight(menus[index].children[subindex].rights)) {
                            subMenu.push(menus[index].children[subindex]);
                        }
                    }
                    menus[index].children = subMenu;
                    sortedMenus.push(menus[index]);

                }

			}

			callback(sortedMenus);
		});
	};

	this.registerAdminEndpoint = function(endpoint, method, func) {
		if (!this.adminEndpointRegistered(endpoint, method)) {
			AdminEndpoints[method][endpoint] = func;
            AdminEndpoints[method][endpoint].pluginID = pluginHelper.getPluginIdentifierFromFilename(__caller, undefined, true);
		} else {
			return new Error("[AdminEndpointException] Endpoint is already registered : " + method + "@" + endpoint);
		}
	};

    this.getEndpoints = function() {
        return AdminEndpoints;
    };

    var deletePluginEndpoints = function (identifier) {
        for (var i in AdminEndpoints) {
            for (var j in AdminEndpoints[i]) {
                if (AdminEndpoints[i][j].pluginID == identifier) {
                    AdminEndpoints[i][j] = undefined;
                    delete AdminEndpoints[i][j];
                }
            }
        }
    };

    var loadHooks = function () {
        hooks.bind('plugindisabled', 1, function(identifier) {
            // Check if plugin created endpoints
            deletePluginEndpoints(identifier);
        });
    };

	this.init = function() {
        loadHooks();
        return this;
	};
};

module.exports = new Admin();
