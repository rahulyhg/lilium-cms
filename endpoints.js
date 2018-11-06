const hooks = require('./hooks.js');
const config = require('./config.js'); 
const log = require('./log.js');

// Schema : { SITE_ID : { METHOD : { ENDPOINT : Object } } }
const registeredEndpoints = {};
const contextualEndpoints = {};

class AllowedMethods {
    constructor() {
        this.GET = {};
        this.POST = {};
    }
}

const loadHooks = () => {
};

class EndPoints {
    list() {
        const dump = [];
        for (let site in registeredEndpoints) {
            for (let method in registeredEndpoints[site]) {
                for (let endpoint in registeredEndpoints[site][method]) {
                    dump.push(method + "  " + site + "/" + endpoint);
                }
            }
        }

        return dump;
    }

    register(site, endpoint, method, callback) {
        if (typeof endpoint == "object" && endpoint.length) {
            for (let i = 0; i < endpoint.length; i++) {
                this.register(site, endpoint[i], method, callback);
            }

            return;
        }        

        log('Endpoint', "Registering endpoint " + method + "@" + endpoint + " for website with id " + site, 'info');
        if (site && site != '*') {
            if (typeof registeredEndpoints[site][method][endpoint] !== 'undefined') {
                return new Error("[EndPointException - Already registered : " + method + "/" + endpoint + "]");
            }

            registeredEndpoints[site][method][endpoint] = callback;
        } else if (site == '*') {
            config.eachSync(config => {
                var site = config.id;
                if (typeof registeredEndpoints[site][method][endpoint] !== 'undefined') {
                    return new Error("[EndPointException - Already registered : " + method + "/" + endpoint + "]");
                }

                registeredEndpoints[site][method][endpoint] = callback;
            });
        }
    };

    registerContextual(site, endpoint, method, callback) {
        contextualEndpoints[site][method][endpoint] = callback;
    };

    executeContextual(endpoint, method, cli, extra) {
        const ed = contextualEndpoints[cli._c.id][method][endpoint];
        ed && ed(cli, extra);
    };

    contextualIsRegistered(site, endpoint, method) {
        return !!contextualEndpoints[site][method][endpoint];
    };

    unregister(site, endpoint, method) {
        if (site == '*') {
            config.eachSync(config => {
                var site = config.id;

                delete registeredEndpoints[site][method][endpoint];
            });
        } else if (typeof registeredEndpoints[site][method][endpoint] !== 'undefined') {
            delete registeredEndpoints[site][method][endpoint];
        }
    };

    isRegistered(site, endpoint, method) {
        return registeredEndpoints[site] && typeof registeredEndpoints[site][method][endpoint] !== 'undefined';
    };

    execute(endpoint, method, cli) {
        const site = cli.routeinfo.configname;
        if (typeof registeredEndpoints[site][method][endpoint] !== 'undefined') {
            registeredEndpoints[site][method][endpoint](cli);
        } else {
            throw new Error("[EndPointException - Not Found : " + method + "/" + endpoint + "]");
        }
    };

    addSite(site) {
        if (typeof registeredEndpoints[site] === 'undefined') {
            registeredEndpoints[site] = new AllowedMethods();
            contextualEndpoints[site] = new AllowedMethods();
        } else {
            log("Endpoint", "Tried to add existing site " + site);
            return new Error("[EndPointException - Tried to add existing site " + site + "]");
        }
    };

    init() {
        loadHooks();
    };
};

module.exports = new EndPoints();
