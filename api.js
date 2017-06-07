const ApiEndpoints = {
	GET : {},
    POST : {}
};

const db = require('./includes/db.js');
const article = require('./article.js');
const endpoints = require('./endpoints.js');
const sharedcache = require('./sharedcache.js');

class LiliumAPI {
	serveApi(cli) {
		cli.touch('api.serveApi');
		api.handleApiEndpoint(cli);
	};	

	handleApiEndpoint(cli) {
		cli.touch('api.handleAdminEndpoint');

        if (!cli.routeinfo.path[1]) {
		    cli.throwHTTP(404, undefined, true);
        } else if (api.apiEndpointRegistered(cli._c.id + cli.routeinfo.path[1], cli.method)) {
		    ApiEndpoints[cli.method][cli._c.id + cli.routeinfo.path[1]](cli);
		} else {
		    cli.throwHTTP(404, undefined, true);
		}
	};

	apiEndpointRegistered(endpoint, method) {
		return (typeof ApiEndpoints[method][endpoint] !== 'undefined');
	};

	registerApiEndpoint(endpoint, method, func) {
	    ApiEndpoints[method][endpoint] = func;
	};

    pushInCache(key, value, done) {
        sharedcache.set({
            ["api_" + key] : value
        }, done || function() {});
    };

    fetchFromCache(key, done) {
        sharedcache.get(key, value => {
            done(value);   
        });
    };
}

const api = new LiliumAPI();
module.exports = api;
