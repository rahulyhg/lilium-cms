var AdminEndpoints = {
	GET : {},
	POST : {}
};

var filelogic = require('../filelogic.js');
var formBuilder = require('../formBuilder');

var Admin = function() {
	this.serveDashboard = function(cli) {
		cli.touch('admin.serverDashboard');
	
		if (cli.routeinfo.path.length == 1) {
			filelogic.runLogic(cli);
		} else {
			this.handleAdminEndpoint(cli);
		}
	};

	this.serveLogin = function(cli) {
		cli.touch('admin.serverLogin');
		filelogic.runLogic(cli);
	};

	this.handleAdminEndpoint = function(cli) {
		cli.touch('admin.handleAdminEndpoint');

		if (this.adminEndpointRegistered(cli.routeinfo.path[1], cli.method)) {
			this.executeEndpoint(cli);
		} else {
			cli.throwHTTP(404, 'Unregistered Admin Endpoint : ' + cli.routeinfo.path[1]);
		}
	};

	this.executeEndpoint = function(cli) {
		cli.touch('admin.executeEndpoint');
		AdminEndpoints[cli.method][cli.routeinfo.path[1]](cli);
	};

	this.adminEndpointRegistered = function(endpoint, method) {
		return (typeof AdminEndpoints[method][endpoint] !== 'undefined');
	};

	this.registerAdminEndpoint = function(endpoint, method, func) {
		if (!this.adminEndpointRegistered(endpoint, method)) {
			AdminEndpoints[method][endpoint] = func;
		} else {
			throw "[AdminEndpointException] Endpoint is already registered : " + method + "@" + endpoint;
		}	
	};

	var init = function() {

	};

	init();
};

module.exports = new Admin();
