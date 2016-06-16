var ApiEndpoints = {
	GET : {}
};

var db = require('./includes/db.js');
var article = require('./article.js')

var api = function(){

	this.serveApi = function(cli) {
		cli.touch('api.serveApi');

		if (cli.routeinfo.path.length == 1) {
			cli.redirect(cli._c.server.url + "/api/articles", false);
		} else {
			this.handleApiEndpoint(cli);
		}
	};	

	this.handleApiEndpoint = function(cli) {
		cli.touch('api.handleAdminEndpoint');

		if (this.apiEndpointRegistered(cli.routeinfo.path[1], cli.method)) {
			this.executeEndpoint(cli);
		} else {
			cli.throwHTTP(404, 'Unregistered Api Endpoint : ' + cli.routeinfo.path[1]);
		}
	};

	this.apiEndpointRegistered = function(endpoint, method) {
		return (typeof ApiEndpoints[method][endpoint] !== 'undefined');
	};

	this.registerApiEndpoint = function(endpoint, method, func) {
		if (!this.apiEndpointRegistered(endpoint, method)) {
			ApiEndpoints[method][endpoint] = func;
		} else {
			return new Error("[ApiEndpointException] Endpoint is already registered : " + method + "@" + endpoint);
		}
	};

	this.executeEndpoint = function(cli) {
		cli.touch('api.executeEndpoint');
		ApiEndpoints[cli.method][cli.routeinfo.path[1]](cli);
	};	

	this.articlesHandleGET = function(cli) {

		var contentSingleSearch = function(cli, id){
			article.deepFetch(cli._c, id, function(row){
		        if (row || row.length == 0) {
		            cli.sendJSON({
		                success: false,
		                error: "Content not found"
		            })
		        } else {
		        	cli.sendJSON(row)
		       	};
			});
		};

		var contentListSearch = function(cli, params) {
			db.findToArray(cli._c, 'content', params, function(err, row) {
		        if (err || row.length == 0) {
		            cli.sendJSON({
		                success: false,
		                error: "Content not found"
		            })
		        } else {
		        	cli.sendJSON(row)
		       	}
	   	 	});
		};

		if (cli.routeinfo.path.length > 2) {
			switch (cli.routeinfo.path[2]) {
				case "single":
					contentSingleSearch(cli, cli.routeinfo.path[3])
					break;
				case  "list":
					var moderatedSearchParameters = cli.routeinfo.params;
					moderatedSearchParameters.status = "published"
				    contentListSearch(cli, moderatedSearchParameters)
					break;
			}
		} else {
			var moderatedSearchParameters = cli.routeinfo.params;
			moderatedSearchParameters.status = "published"
		    contentListSearch(cli, moderatedSearchParameters)
		}

	};
};

module.exports = new api();