var fileserver = require('../fileserver.js');
var LML = require('../lml.js');
var db = require('../includes/db.js');

var Login = function() {
	this.presentLoginPage = function(cli) {
		
	};

	this.authUser = function(cli) {
		cli.touch('login.authUser');
		cli.debug();
	};
	
	var init = function() {

	};

	init();
};

module.exports = new Login();
