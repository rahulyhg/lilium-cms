var fileserver = require('../fileserver.js');
var LML = require('../lml.js');
var db = require('../includes/db.js');
var CryptoJS = require('crypto-js');
var _c = require('../config.js');
var entities = require('../entities.js');
var formbuilder = require('../formBuilder.js');
var hooks = require('../hooks.js');
var sessions = require('../session.js');
var log = require('../log.js');

var Login = function() {
	var loginSuccess = function(cli, userObj) {
		cli.touch('login.loginsuccess');
		sessions.createSessionInCli(cli, userObj);

        if (!userObj.welcomed) {
            log('Login', 'Logged in user ' + userObj.username + " for the first time");
            handleFirstLogin(cli, userObj);
        } else {
		    entities.registerLogin(cli, userObj, function() {
                log('Login', 'Logged in user ' + userObj.username);
                hooks.fire('user_loggedin', cli);
            });
        }
	};

	this.authUser = function(cli) {
		cli.touch('login.authUser');
		var usr = cli.postdata.data.usr;
		var psw = cli.postdata.data.psw;

		if (
			typeof usr !== 'undefined' && 
            typeof psw !== 'undefined' && 
            usr !== '' && 
            psw !== ''
		) {
			db.match(cli._c, "entities", {
				'username' : usr,
				'shhh' : CryptoJS.SHA256(psw).toString(CryptoJS.enc.Hex)
			}, function(found) {
				cli.touch('db.match('+found+')');

				if (found) {
					entities.fetchFromDB(cli._c, usr, function(userObj) {
						loginSuccess(cli, userObj);
					});
				} else {
					hooks.fire('user_login_failed', cli);
					cli.redirect(cli._c.server.url + "/" + cli._c.paths.login + "?failed", false);
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
			.trg('userpass')
			.add('login', 'submit', {displayname:"Login",wrapperCssSuffix:"loginbutton"});
	};

    var handleFirstLogin = function(cli, userObj) {
        entities.firstLogin(cli, userObj, function() {
            cli.redirect(cli._c.server.url + '/admin/welcome', false);
        });
    };

	var init = function() {

	};

	init();
};

module.exports = new Login();
