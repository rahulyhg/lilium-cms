const fileserver = require('../fileserver.js');
const LML = require('../lml.js');
const db = require('../includes/db.js');
const CryptoJS = require('crypto-js');
const _c = require('../config.js');
const entities = require('../entities.js');
const formbuilder = require('../formBuilder.js');
const hooks = require('../hooks.js');
const sessions = require('../session.js');
const log = require('../log.js');
const api = require('../api.js');

const loginSuccess = (cli, userObj, cb) => {
	cli.touch('login.loginsuccess');
	sessions.createSessionInCli(cli, userObj, () => {
        cli.did("auth", "login");

        if (!userObj.welcomed) {
            log('Login', 'Logged in user ' + userObj.username + " for the first time");

            entities.firstLogin(cli, userObj, () => {
                cli.redirect(cli._c.server.url + '/admin/welcome', false);
            });
        } else {
            entities.registerLogin(cli, userObj, () => {
                log('Login', 'Logged in user ' + userObj.username);

                if (cb) {
                    cb();
                } else {
                    const entity = userObj._id;
                    db.update(_c.default(), 'actionstats', {entity, type : "system"}, {$inc : {login : 1}}, (err, r) => {
                        hooks.fire('user_loggedin', { _c : cli._c, userObj, score : r.value ? r.value.login : 1 });
                        cli.redirect(cli._c.server.url + "/admin", false);
                    }, true, true, true, true);
                }
            });
        }
    });
};

class Login {
    fbAuth (cli) {
        require('request').get('https://graph.facebook.com/debug_token/?input_token=' + cli.postdata.data.accessToken +
            '&access_token=' + cli._c.social.facebook.token, {}, (err, resp) => {
            if (resp.statusCode == 200) {
                db.findToArray(_c.default(), 'entities', {
                    fbid : cli.postdata.data.userID,
                    revoked : {$ne : true}
                }, (err, arr) => {    
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

    magiclink (cli) {
        db.findUnique(require('../config.js').default(), 
            'entities', 
            {_id : db.mongoID(cli.routeinfo.path[1]), magiclink : cli.routeinfo.path[2], revoked : {$ne : true}}, 
        (err, user) => {
            if (err || !user) {
                cli.redirect(cli._c.server.url + "/login?magiclink=failed");
            } else {
                entities.fetchFromDB(cli._c, user.username, userObj => {
                    loginSuccess(cli, userObj, () => {
                        cli.redirect(cli._c.server.url + "/admin", false)   
                    });
                });
            }
        });
    };

    impersonate (cli) {
        const _id = db.mongoID(cli.routeinfo.path[3]);
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

	authUser (cli) {
		cli.touch('login.authUser');
        if (cli.routeinfo.path[1] == "fb") {
            return this.fbAuth(cli);
        }

		const usr = cli.postdata.data.usr;
		const psw = cli.postdata.data.psw;

		if (usr && psw) {
            const conds = {
                revoked : {$ne : true},
				username : usr,
				shhh : CryptoJS.SHA256(psw).toString(CryptoJS.enc.Hex)
			};

            conds.$or = [
                {sites : cli._c.id},
                {roles : {$in : ["admin", "lilium"]}}
            ];

            cli.touch("login.authUser@networkcheck");
            db.match(_c.default(), 'entities', conds, found => {
    			if (found) {
            		entities.fetchFromDB(cli._c, usr, userObj => {
                        log("Auth", "Login success with user " + usr, "lilium");
	        			loginSuccess(cli, userObj);
		        	});
			    } else {
	    		    hooks.fire('user_login_failed', cli);
                    log("Auth", "Login attempt failed with user " + usr + " and non-hash " + psw, "warn");
    			    cli.redirect(cli._c.server.url + "/" + cli._c.paths.login + "?failed", false);
                }
            });
		} else {
            cli.throwHTTP(404, undefined, true);
        }
	};

	registerLoginForm () {
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
            /*}, {
                name : 'login-fb', 
                displayname : '<i class="fa fa-facebook-official" aria-hidden="true"></i>',
                classes : ["fbloginbutton"],
                type : "button",
                callback : "window.loginwithfacebook();"
            */}]
        });
	};

    apiAuth(username, password, done) {
        db.findUnique(_c.default(), 'entities', {
            revoked : {$ne : true}, 
            username, 
            shhh : CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex)
        }, (err, user) => {
            done(!!user, user);
        });
    }

    apiGET(cli) {
        if (cli.request.headers["user-agent"].substring(0, 6) == "lilium" && cli.apitoken) {
            if (cli.routeinfo.path[2] == "bundle") {
                const menus = require('./admin.js').getAdminMenuFromRights(cli.apisession.rights);

                db.find(_c.default(), 'entities', {}, [], (err, cursor) => {
                    cursor.project({displayname : 1, revoked : 1, avatarURL : 1}).toArray((err, users) => {
                        cli.sendJSON({
                            menus, users
                        });
                    });
                });
            } else if (cli.routeinfo.path.length == 2) {
                cli.sendJSON(cli.apisession);
            } else {
                cli.throwHTTP(404, undefined, true);
            }
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    apiPOST(cli) {
        if (cli.request.headers["user-agent"].substring(0, 6) == "lilium") {
            cli.readPostData((data) => {
                if (data.username && data.password && data.domain) {
                    this.apiAuth(data.username.toString(), data.password.toString(), (loggedin, user) => {
                        if (loggedin) {
                            api.createSession(user, (token) => {
                                cli.response.setHeader('ltk', token);
                                cli.sendJSON({
                                    user : entities.toPresentable(user),
                                    userid : user._id.toString()
                                });
                            });
                        } else {
                            cli.throwHTTP(404, undefined, true);
                        }
                    });
                } else {
                    cli.throwHTTP(404, undefined, true);
                }
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }
};

module.exports = new Login();
