const ApiEndpoints = {
	GET : {},
    POST : {}
};

const db = require('./includes/db.js');
const article = require('./article.js');

class LiliumAPI {
	serveApi(cli) {
		cli.touch('api.serveApi');
		api.handleApiEndpoint(cli);
	};	

	handleApiEndpoint(cli) {
		cli.touch('api.handleAdminEndpoint');

		if (api.apiEndpointRegistered(cli.routeinfo.path[1], cli.method)) {
		    ApiEndpoints[cli.method][cli.routeinfo.path[1]](cli);
		} else {
			cli.throwHTTP(404, 'Unregistered Api Endpoint : ' + cli.routeinfo.path[1]);
		}
	};

	apiEndpointRegistered(endpoint, method) {
		return (typeof ApiEndpoints[method][endpoint] !== 'undefined');
	};

	registerApiEndpoint(endpoint, method, func) {
	    ApiEndpoints[method][endpoint] = func;
	};
}

const api = new LiliumAPI();
module.exports = api;
