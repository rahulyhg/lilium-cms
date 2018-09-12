const log = require('../log.js');
const fileserver = require('../fileserver.js');
const config = require('../config.js');
const Admin = require('../backend/admin.js');
const Livevar = require('../livevars.js');
const Endpoints = require('../endpoints.js');
const Hooks = require('../hooks.js');
const CAIJ = require('../caij/caij.js');
const API = require('../api.js');

const isElder = require('../network/info.js').isElderChild();

class FlowHandle {
    constructor(river, flow) {
        this.river = river;
        this.flow = flow;
    }

    bind(type) {
        this.type = type;

        switch (this.type) {
            case "admin_get"   : log("Riverflow", "Used Riverflow admin_get method, but it's deprecated", "warn"); break; 
            case "admin_post"  : Admin.registerAdminEndpoint(this.flow.endpoint, 'POST', this.river.adminPOST.bind(this.river)); break;
            case "admin_put"   : Admin.registerAdminEndpoint(this.flow.endpoint, 'PUT',  this.river.adminPUT.bind(this.river));  break;
            case "admin_delete": Admin.registerAdminEndpoint(this.flow.endpoint, 'DELETE', this.river.adminDELETE.bind(this.river)); break;
            case "livevar"     : Livevar.registerLiveVariable(this.flow.endpoint, this.river.livevar.bind(this.river));          break;
            case "get"         : Endpoints.register('*', this.flow.endpoint, 'GET', this.river.GET.bind(this.river));            break;
            case "post"        : Endpoints.register('*', this.flow.endpoint, 'POST', this.river.POST.bind(this.river));          break;
            case "api_get"     : API.registerApiEndpoint(this.flow.endpoint, 'GET', this.river.apiGET.bind(this.river));         break;
            case "api_post"    : API.registerApiEndpoint(this.flow.endpoint, 'POST', this.river.apiPOST.bind(this.river));       break;
            case "api_put"     : API.registerApiEndpoint(this.flow.endpoint, 'PUT', this.river.apiPUT.bind(this.river));         break;
            case "api_delete"  : API.registerApiEndpoint(this.flow.endpoint, 'DELETE', this.river.apiDELETE.bind(this.river));   break;
            case "form"        : this.river.form.apply(this.river);                                                              break;
            case "table"       : this.river.table.apply(this.river);                                                             break;
            case "setup"       : this.river.setup.apply(this.river);                                                             break;
        }

        log('Riverflow', "Created '" + this.type + "' handle for flow with endpoint : " + this.flow.endpoint);
        return this;
    }
}

class Riverflow {
    constructor() {
        this.rivers = {};
    }

    registerFlow(flow) {
        log("Riverflow", "Creating flow for river " + flow.endpoint);

        let river = require(config.default().server.base + flow.module);
        river.handles = {};
        
        for (let i = 0; i < flow.support.length; i++) {
            river.handles[flow.support[i]] = new FlowHandle(river, flow).bind(flow.support[i]);
        }

        if (flow.hooks) {
            for (let i = 0; i < flow.hooks.length; i++) {
                let hk = flow.hooks[i];
                Hooks.register(hk.name, hk.priority || 10000, river[hk.callback || hk.name].bind(river));
            }
        }

        if (flow.admin_menu) {
            Admin.registerAdminMenu(flow.admin_menu);
        } else if (flow.admin_sub_menu) {
            Admin.registerAdminSubMenu(flow.admin_sub_menu.parent, flow.admin_sub_menu);
        }

        if (flow.post_leaf) {
            let leaf = flow.post_leaf;
            Postleaf.registerLeaf(leaf.name, leaf.displayname, leaf.script.add, leaf.script.edit, leaf.script.show);
        }

        if (flow.caij) {
            isElder && Hooks.bind('init', 1200, () => {
                Object.keys(flow.caij).forEach(name => {
                    let details = flow.caij[name];
                    details.module = flow.module;
                    CAIJ.scheduleTask(details.taskname || name, details);
                });
            });
        }

        river.origin = flow.origin || "Riverflow";
        river.module = flow.module;
        river.endpoint = flow.endpoint;
        river.support = flow.support || [];

        this.rivers[flow.endpoint] = river;
    }

    getRiver(modulename) {
        return this.rivers[modulename] || { origin : "none" };
    }

    loadFlows() {
        if (global.liliumenv.mode == "script") {
            return;
        }

        let flowsPath = config.default().server.base + "riverflow/flows.json";
        const Modules = require(flowsPath);
        
        log('Riverflow', "Loading " + Modules.rivers.length + " rivers");
        for (let i = 0; i < Modules.rivers.length; i++) {
            this.registerFlow(Modules.rivers[i]);
        }
    }
}

module.exports = new Riverflow();
