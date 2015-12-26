var fileserver = require('../fileserver.js');
var LML = require('../lml.js');
var db = require('../includes/db.js');
var CryptoJS = require('crypto-js');

var Login = function() {
	var loginSuccess = function(cli, userObj) {
		cli.touch('login.loginsuccess('+userObj.id+')');

		var dat = cli.request.session.data = {
			loggedin : true,
			role : userObj.roles,
			userid : userObj.id,
			user : userObj.username,
			logintime : new Date(),
			level : 0,
			displayname : userObj.displayname,
			avatar : userObj.avatarID,
			admin : userObj.roles.indexOf('admin') !== -1,
			god : userObj.roles.indexOf('lilium') !== -1,
		};

		dat.dashaccess = dat.admin || dat.god || dat.role.indexOf('dash') !== -1;

		cli.userinfo = dat;
		cli.debug();
	};

	this.authUser = function(cli) {
		cli.touch('login.authUser');
		var usr = cli.postdata.data.username;
		var psw = cli.postdata.data.password;

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
					db.find('entities', {'username':usr}, {limit:[1]}, function(err, cursor) {
						cursor.next(function(err, userObj) {
							loginSuccess(cli, userObj);
							cursor.close();
						});
					});
				} else {
					cli.debug();
				}
			});
		}
	};
	
	var init = function() {

	};

	init();
};

module.exports = new Login();
