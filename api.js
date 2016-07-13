var ApiEndpoints = {
	GET : {}
};

var credentials = {
  clientID: '<client-id>',
  clientSecret: '<client-secret>',
  site: 'https://api.oauth.com',
  authorizationPath: '/oauth2/authorization',
  tokenPath: '/oauth2/access_token',
  revocationPath: '/oauth2/revoke'
};

var db = require('./includes/db.js');
var article = require('./article.js');
var oauth2 = require('simple-oauth2')(credentials);

var api = function(){
	var that = this;

	this.serveApi = function(cli) {
		cli.touch('api.serveApi');

	// 	var authorization_uri = oauth2.authCode.authorizeURL({
	// 	  redirect_uri: cli._c.server.url + "/api/articles",
	// 	  scope: '<scope>',
	// 	  state: '<state>'
	// 	});

	// 	cli.redirect(authorization_uri, false);

	// 	var token;
	// 	var tokenConfig = {
	// 	  code: '<code>',
	// 	  redirect_uri: 'http://localhost:3000/callback'
	// 	};
		 
	// 	// Callbacks 
	// 	// Save the access token 
	// 	oauth2.authCode.getToken(tokenConfig, function saveToken(error, result) {
	// 	  if (error) { console.log('Access Token Error', error.message); }
		 
	// 	  token = oauth2.accessToken.create(result);
	// 	});
		 
	// 	// Promises 
	// 	// Save the access token 
	// 	oauth2.authCode.getToken(tokenConfig)
	// 	.then(function saveToken(result) {
	// 	  token = oauth2.accessToken.create(result);
	// 	})
	// 	.catch(function logError(error) {
	// 	  console.log('Access Token Error', error.message);
	// 	});

	// 	//OATH Authentification will hapen here 

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

	this.searchArticles = function(cli){
		var searchQueries = cli.routeinfo.params;
		console.log(searchQueries)
	};

	this.paramsFindToArray = function(cli, coln, securityOverrides){
		db.findToArray(cli._c, coln, cli.routeinfo.params, function(err, row) {
	        if (err || Object.keys(row).length === 0) {
	            cli.sendJSON({
	                success: false,
	                error: "Content not found"
	            })
	        } else {
	        		if (securityOverrides) {
	        			securityOverrides(row)
	        		};
	        		cli.sendJSON(row)
	        	};
	   	});
	};

	this.authorsHandleGET = function(cli) {
		//delete sensitive information from the display object 
		keysToNotDsiplay = ["shhh", "data", "roles", "preferences"]
		var securityOverrides = function(row){
			row.forEach(function(item){
					delete item.shhh;
					delete item.roles;
					delete item.data;
					delete item.preferences;
			})
		}
		that.paramsFindToArray(cli, 'entities', securityOverrides)
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
				case "list":
				    that.paramsFindToArray(cli, 'content')
					break;
				case "search":
					console.log('underconstructions');
					break;
			}
		} else {
			that.paramsFindToArray(cli, 'content')
		}

	};
};

module.exports = new api();