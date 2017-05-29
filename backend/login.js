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
	var loginSuccess = function(cli, userObj, cb) {
		cli.touch('login.loginsuccess');
		sessions.createSessionInCli(cli, userObj, function() {
            cli.did("auth", "login");

            if (!userObj.welcomed) {
                log('Login', 'Logged in user ' + userObj.username + " for the first time");
                handleFirstLogin(cli, userObj);
            } else {
                entities.registerLogin(cli, userObj, function() {
                    log('Login', 'Logged in user ' + userObj.username);

                    if (cb) {
                        cb();
                    } else {
                        var entity = userObj._id;
                        db.update(_c.default(), 'actionstats', {entity, type : "system"}, {$inc : {login : 1}}, function(err, r) {
                            hooks.fire('user_loggedin', { _c : cli._c, userObj, score : r.value ? r.value.login : 1 });
                            cli.redirect(cli._c.server.url + "/admin", false);
                        }, true, true, true, true);
                    }
                });
            }
        });
	};

    this.fbAuth = function(cli) {
        require('request').get('https://graph.facebook.com/debug_token/?input_token=' + cli.postdata.data.accessToken +
            '&access_token=' + cli._c.social.facebook.token, {}, function(err, resp) {
            if (resp.statusCode == 200) {
                db.findToArray(_c.default(), 'entities', {
                    fbid : cli.postdata.data.userID,
                    revoked : {$ne : true}
                }, function(err, arr) {    
                    if (arr.length == 0) {
                        cli.sendJSON({
                            status : 200,
                            success : false,
                            invalidator : "lilium",
                            reason : "entities"
                        });
                    } else {
            			entities.fetchFromDB(cli._c, arr[0].username, function(userObj) {
	            		    loginSuccess(cli, userObj, function() {
                                cli.sendJSON({
                                    status : 200,
                                    success : true,
                                    userid : userObj._id
                                });
                            });
                        });
                    }
                });
            } else {
                cli.sendJSON({
                    status : resp.statusCode,
                    success : false,
                    invalidator : "facebook",
                    reason : "token"
                });
            }
        });
    };

    this.magiclink = function(cli) {
        db.findUnique(require('../config.js').default(), 
            'entities', 
            {_id : db.mongoID(cli.routeinfo.path[1]), magiclink : cli.routeinfo.path[2], revoked : {$ne : true}}, 
        function(err, user) {
            if (err || !user) {
                cli.redirect(cli._c.server.url + "/login?magiclink=failed");
            } else {
                entities.fetchFromDB(cli._c, user.username, function(userObj) {
                    loginSuccess(cli, userObj, function() {
                        cli.redirect(cli._c.server.url + "/admin", false)   
                    });
                });
            }
        });
    };

    this.impersonate = function(cli) {
        var _id = db.mongoID(cli.routeinfo.path[3]);
        if (cli.hasRight("develop")) {
            db.findUnique(_c.default(), 'entities', {_id}, function(err, user) {
    			if (user) {
            		entities.fetchFromDB(cli._c, user._id, function(userObj) {
	        			userObj ? loginSuccess(cli, userObj) : cli.throwHTTP(404);
                    }, true);
                } else {
                    cli.throwHTTP(404);
                }
            });
        } else {
            cli.throwHTTP(403)
        }
    }

	this.authUser = function(cli) {
		cli.touch('login.authUser');
        if (cli.routeinfo.path[1] == "fb") {
            return this.fbAuth(cli);
        }

		var usr = cli.postdata.data.usr;
		var psw = cli.postdata.data.psw;

		if (usr && psw) {
            var conds = {
                revoked : {$ne : true},
				username : usr,
				shhh : CryptoJS.SHA256(psw).toString(CryptoJS.enc.Hex)
			};

            conds.$or = [
                {sites : cli._c.id},
                {roles : {$in : ["admin", "lilium"]}}
            ];

            cli.touch("login.authUser@networkcheck");
            db.match(_c.default(), 'entities', conds, function(found) {
    			if (found) {
            		entities.fetchFromDB(cli._c, usr, function(userObj) {
	        			loginSuccess(cli, userObj);
		        	});
			    } else {
	    		    hooks.fire('user_login_failed', cli);
    			    cli.redirect(cli._c.server.url + "/" + cli._c.paths.login + "?failed", false);
                }
            });
		} else {
            cli.throwHTTP(404, undefined, true);
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
            .add('loginbtnset', 'buttonset', {
                buttons : [{
                    name : 'login', 
                    displayname : "Login",
                    classes : ["loginbutton"]
                }, {
                    name : 'login-fb', 
                    displayname : '<i class="fa fa-facebook-official" aria-hidden="true"></i>',
                    classes : ["fbloginbutton"],
                    type : "button",
                    callback : "window.loginwithfacebook();"
                }]
            });
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
