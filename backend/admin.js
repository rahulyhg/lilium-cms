const AdminEndpoints = {
	GET : {},
	POST : {},
    PUT : {},
    DELETE : {}
};

const AdminMenus = [];

const filelogic = require('../filelogic.js');
const LML2 = require('../lml/compiler.js');
const LML3 = require('../lml3/compiler');
const hooks = require('../hooks.js');

class AdminMenu {
    constructor() {
        this.id = "";
        this.faicon = "";
        this.displayname = "";
        this.priority = -1;
        this.rights = [];
        this.absURL = "";
        this.children = [];
    }
};

class Admin {
	serveDashboard (cli) {
		cli.touch('admin.serverDashboard');
		this.handleAdminEndpoint(cli);
	};

	handleGETDashboard (cli) {
		filelogic.serveAdminLML(cli);
	};

	serveLogin (cli) {
        cli.touch('admin.serverLogin');
        log('Login', 'Compiling login page using LML3', 'info');
        LML3.compile(cli._c, liliumroot + "/backend/dynamic/login.lml3", {}, markup => {
            cli.sendHTML(markup);
        });
	};

    welcome (cli, method) {
        if (method == 'GET') {
            LML2.compileToFile(cli._c.server.base + "/backend/dynamic/admin/welcome.lml",
                cli._c.server.html + "/static/tmp/welcome.html",
                () => {
                    require('../fileserver.js').pipeFileToClient(
                        cli, 
                        cli._c.server.html + "/static/tmp/welcome.html", 
                        function() {}, 
                        true
                    );
                }, {
                    config : cli._c
                }
            );

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

	handleAdminEndpoint (cli) {
		cli.touch('admin.handleAdminEndpoint');
    
        if (this.adminEndpointRegistered(cli.routeinfo.path[1], cli.method)) {
			this.executeEndpoint(cli);
		} else {
            cli.did('request', '404', {url : cli.routeinfo.fullpath});
            filelogic.serveErrorPage(cli, '404');
		}
	};

	createAdminMenuTemplate () {
		return new AdminMenu();
	};

	registerAdminMenu (adminmenu) {
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

    registerAdminSubMenu (parentMenuId, adminmenu) {
        for (let index in AdminMenus) {
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

	getAdminMenus () {
		return AdminMenus;
	};

	executeEndpoint (cli) {
		cli.touch('admin.executeEndpoint');
        cli.did('request', 'admin', {'endpoint' : cli.routeinfo.fullpath});
		AdminEndpoints[cli.method][cli.routeinfo.path[1]](cli);
	};

	adminEndpointRegistered (endpoint, method) {
		return (typeof AdminEndpoints[method][endpoint] !== 'undefined');
	};

    getAdminMenuFromRights(rights) {
        const menus = this.getAdminMenus();
        const out = [];
        let all = rights.indexOf('admin') != -1;

        for (let name in menus) {
            let valid = true;
            !all && menus[name].rights.forEach(s => {
                if (valid && rights.indexOf(s) == -1) {
                    valid = false;
                }
            });

            valid && out.push(menus[name]);

            menus[name].children && menus[name].children.forEach(child => {
                let validc = true;
                !all && child.rights.forEach(s => {
                    if (validc && rights.indexOf(s) == -1) {
                        validc = false;
                    }
                });

                validc && out.push(child);
            });
        }

        return out.map(x => { return { displayname : x.displayname, icon : x.faicon, id : x.id }; });
    };

	registerLiveVar () {
		let that = this;

		require('../livevars.js').registerLiveVariable('adminmenus', (cli, levels, params, callback) => {
            const sortedMenus = [];
            const menus = that.getAdminMenus();

            for (let index in menus) {
                let subMenu = [];

                if (cli.hasRight(menus[index].rights)) {
                    let submenus = [];

                    for (let subindex in menus[index].children) {
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

	registerAdminEndpoint (endpoint, method, func) {
		if (!this.adminEndpointRegistered(endpoint, method)) {
			AdminEndpoints[method][endpoint] = func;
		} else {
			return new Error("[AdminEndpointException] Endpoint is already registered : " + method + "@" + endpoint);
		}
	};

    getEndpoints () {
        return AdminEndpoints;
    };

	init() {
        return this;
	};
};

module.exports = new Admin();
