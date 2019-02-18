const config = require('../config.js');
const Admin = require('../backend/admin.js');
const Livevar = require('../livevars.js');
const Endpoints = require('../pipeline/endpoints.js');
const Hooks = require('../hooks.js');
const CAIJ = require('../caij/caij.js');
const API = require('../pipeline/api.js');

const isElder = require('../network/info.js').isElderChild();

class FlowHandle {
    constructor(river, flow) {
        this.river = river;
        this.flow = flow;
    }

    bind(type) {
        this.type = type;

        switch (this.type) {
            case "livevar"     : Livevar.registerLiveVariable(this.flow.endpoint,           this.river[this.flow.overrides.livevar || "livevar"].bind(this.river));         break;
            case "admin_post"  : Admin.registerAdminEndpoint(this.flow.endpoint, 'POST',    this.river[this.flow.overrides.adminPOST || "adminPOST"].bind(this.river));     break;
            case "admin_put"   : Admin.registerAdminEndpoint(this.flow.endpoint, 'PUT',     this.river[this.flow.overrides.adminPUT || "adminPUT"].bind(this.river));       break;
            case "admin_delete": Admin.registerAdminEndpoint(this.flow.endpoint, 'DELETE',  this.river[this.flow.overrides.adminDELETE || "adminDELETE"].bind(this.river)); break;
            case "get"         : Endpoints.register('*', this.flow.endpoint,     'GET',     this.river[this.flow.overrides.GET || "GET"].bind(this.river));                 break;
            case "post"        : Endpoints.register('*', this.flow.endpoint,     'POST',    this.river[this.flow.overrides.POST || "POST"].bind(this.river));               break;
            case "put"         : Endpoints.register('*', this.flow.endpoint,     'PUT',     this.river[this.flow.overrides.PUT || "PUT"].bind(this.river));                 break;
            case "delete"      : Endpoints.register('*', this.flow.endpoint,     'DELETE',  this.river[this.flow.overrides.DELETE || "DELETE"].bind(this.river));           break;
            case "api_get"     : API.registerApiEndpoint(this.flow.endpoint,     'GET',     this.river[this.flow.overrides.apiGET || "apiGET"].bind(this.river));           break;
            case "api_post"    : API.registerApiEndpoint(this.flow.endpoint,     'POST',    this.river[this.flow.overrides.apiPOST || "apiPOST"].bind(this.river));         break;
            case "api_put"     : API.registerApiEndpoint(this.flow.endpoint,     'PUT',     this.river[this.flow.overrides.apiPUT || "apiPUT"].bind(this.river));           break;
            case "api_delete"  : API.registerApiEndpoint(this.flow.endpoint,     'DELETE',  this.river[this.flow.overrides.apiDELETE || "apiDELETE"].bind(this.river));     break;
            case "setup"       : this.river.setup ? this.river.setup.apply(this.river) : console.log("Missing setup for " + this.flow.endpoint);                                                            break;

            default : log("Riverflow", "Used unknown Riverflow handle " + this.type, "warn"); console.log(new Error()); return this; 
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

        let river = require(liliumroot + "/" + flow.module);
        river.handles = {};
        flow.overrides = river.overrides || {};
        
        flow.support.forEach(support => {
            river.handles[support] = new FlowHandle(river, flow).bind(support);
        });

        if (flow.hooks) {
            for (let i = 0; i < flow.hooks.length; i++) {
                let hk = flow.hooks[i];
                Hooks.register(hk.name, hk.priority || 10000, river[hk.callback || hk.name].bind(river));
            }
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

        const Modules = require("./flows");
        
        log('Riverflow', "Loading " + Modules.rivers.length + " rivers");
        Modules.rivers.forEach(river => this.registerFlow(river));

        log('Riverflow', "Registering " + Modules.menus.length + " admin menus");
        Modules.menus.forEach(menu => Admin.registerAdminMenu(menu));
    }
}

module.exports = new Riverflow();
