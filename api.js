var ApiEndpoints = {
	GET : {}
};

var db = require('./includes/db.js');
var article = require('./article.js')

var api = function(){
	var that = this;

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

	this.paramsFindToArray = function(cli, coln){
		db.findToArray(cli._c, coln, cli.routeinfo.params, function(err, row) {
	        if (err || Object.keys(row).length === 0) {
	            cli.sendJSON({
	                success: false,
	                error: "Content not found"
	            })
	        } else {
	        	cli.sendJSON(row)
	       	}
	   	});
	};

	this.authorsHandleGET = function(cli) {
		that.paramsFindToArray(cli, 'entities')
	};

	this.categoriesHandleGET = function(cli){
		that.paramsFindToArray(cli, 'categories')
	};

	this.articlesHandleGET = function(cli) {
		var contentSingleSearch = function(cli, id){
			article.deepFetch(cli._c, id, function(row){
		        if (Object.keys(row).length === 0) {
		            cli.sendJSON({
		                success: false,
		                error: "Content not found"
		            })
		        } else {
		        	cli.sendJSON(row)
		       	};
			});
		};

		if (cli.routeinfo.path.length > 2) {
			switch (cli.routeinfo.path[2]) {
				case "single":
					contentSingleSearch(cli, cli.routeinfo.path[3])
					break;
				case  "list":
				    that.paramsFindToArray(cli, 'content')
					break;
			}
		} else {
			that.paramsFindToArray(cli, 'content')
		}

	};
};

module.exports = new api();