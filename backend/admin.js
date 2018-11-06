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
        }

        return out.map(x => { return { displayname : x.displayname, icon : x.faicon, id : x.id }; });
    };

	registerLiveVar () {
		let that = this;

		require('../livevars.js').registerLiveVariable('adminmenus', (cli, levels, params, callback) => {
            if (!levels[0]) {
                const sortedMenus = [];
                const menus = that.getAdminMenus();
    
                for (let index in menus) {
                    let subMenu = [];
    
                    if (cli.hasRight(menus[index].rights)) {
                        sortedMenus.push(menus[index]);
                    }
                }
                
                callback(sortedMenus);
            } else if (levels[0] == "sections") {
                const sections = {};
                const menus = that.getAdminMenus();

                for (let prio in menus) {
                    const m = menus[prio];

                    if (!m.section) {
                        m.section = "other";
                    }
                    sections[m.section] = sections[m.section] || [];
                    cli.hasRight(m.rights) && sections[m.section].push(m);
                }

                callback(sections);
            }
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
