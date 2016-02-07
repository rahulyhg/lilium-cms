var fileserver = require('../fileserver.js');
var LML = require('../lml.js');
var db = require('../includes/db.js');
var CryptoJS = require('crypto-js');
var _c = require('../config.js');
var entities = require('../entities.js');
var formbuilder = require('../formBuilder.js');
var hooks = require('../hooks.js');

var Login = function() {
	var loginSuccess = function(cli, userObj) {
		cli.touch('login.loginsuccess('+userObj.id+')');

		userObj.loggedin = true;
		userObj.logintime = new Date();
		userObj.admin = entities.isAllowed(userObj, 'admin');
		userObj.god = entities.isAllowed(userObj, 'lilium');
		userObj.dashaccess = entities.isAllowed(userObj, 'dash');
		userObj.user = userObj.username;

		cli.request.session.data = userObj;
		cli.userinfo = userObj;
		hooks.fire('user_loggedin', cli);
	};

	this.authUser = function(cli) {
		cli.touch('login.authUser');
		var usr = cli.postdata.data.usr;
		var psw = cli.postdata.data.psw;

		if (
			typeof usr !== 'undefined' && typeof psw !== 'undefined'
			&& usr !== '' && psw !== ''
		) {
			db.match("entities", {
				'username' : usr,
				'shhh' : CryptoJS.SHA256(psw).toString(CryptoJS.enc.Hex)
			}, function(found) {
				cli.touch('db.match('+found+')');

				if (found) {
					entities.fetchFromDB(usr, function(userObj) {
						loginSuccess(cli, userObj);
					});
				} else {
					cli.redirect(_c.default.server.url + "/" + _c.default.paths.login + "?failed", false);
				}
			});
		}
	};

	this.registerLoginForm = function() {
		formbuilder.createForm('login_form', {
				fieldWrapper : {
					'tag' : 'div',
					'cssPrefix' : "loginfield-"
				},
				cssClass : "dashboard-login-form"
			})
			.add('usr', 'text', {displayname:"Username", placeholder:true,wrapperCssSuffix:"username"})
			.add('psw', 'password', {displayname:"Password", placeholder:true,wrapperCssSuffix:"password"})
			.add('login', 'submit', {displayname:"Login",wrapperCssSuffix:"loginbutton"});
	};
	
	var init = function() {

	};

	init();
};

module.exports = new Login();
