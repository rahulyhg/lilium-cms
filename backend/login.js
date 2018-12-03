const db = require('../includes/db.js');
const CryptoJS = require('crypto-js');
const _c = require('../config.js');
const entities = require('../entities.js');
const hooks = require('../hooks.js');
const sessions = require('../session.js');
const log = require('../log.js');
const api = require('../api.js');
const twoFactor = require('../twoFactor');

const loginSuccess = (cli, userObj, cb) => {
	cli.touch('login.loginsuccess');
	sessions.createSessionInCli(cli, userObj, () => {
        cli.did("auth", "login");

        if (!userObj.welcomed) {
            log('Login', 'Logged in user ' + userObj.username + " for the first time");

            entities.firstLogin(cli, userObj, () => {
                cli.redirect(cli._c.server.url + '/lilium/onboarding', false);
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
                        cli.sendJSON({
                            success : true,
                            to : cli.routeinfo.params.to || (cli._c.server.url + "/lilium")
                        })
                    }, true, true, true, true);
                }
            });
        }
    });
};

class Login {
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
                        cli.redirect(cli._c.server.url + "/lilium", false)   
                    });
                });

                db.update(require('../config.js').default(), 'entities', {_id : user._id}, { magiclink : CryptoJS.SHA256(Math.random()).toString() }, () => {});
            }
        });
    };

    impersonate (cli) {
        const _id = db.mongoID(cli.routeinfo.path[3]);
        if (cli.hasRight("develop")) {
            db.findUnique(_c.default(), 'entities', {_id}, (err, user) => {
    			if (user) {
            		entities.fetchFromDB(cli._c, user._id, userObj => {
                        log('Entities', cli.userinfo.displayname + " impersonates " + userObj.displayname, "lilium");
	        			userObj ? loginSuccess(cli, userObj) : cli.throwHTTP(404);
                    }, true);
                } else {
                    cli.throwHTTP(404);
                }
            });
        } else {
            cli.throwHTTP(403);
        }
    }

	authUser (cli) {
		cli.touch('login.authUser');
		const usr = cli.postdata.data.usr;
        const psw = cli.postdata.data.psw;
        const token2fa = cli.postdata.data.token2fa;

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
            db.findUnique(_c.default(), 'entities', conds, (err, user) => {
                if (!err && user) {
                    if (user.enforce2fa && user.confirmed2fa) {
                        
                        if (token2fa && twoFactor.validate2fa(user._id.toString(), token2fa)) {
                            entities.fetchFromDB(cli._c, user.username, userObj => {
                                log("Auth", "Login with credentials and 2FA success with user " + user.username, "lilium");
                                loginSuccess(cli, userObj);
                            });
                        } else {
                            hooks.fire('user_login_failed', cli);
                            log("Auth", "Login attempt failed with user " + usr + " due to invalid 2FA token", "warn");
                            cli.sendJSON({ error: 'credentials', message: (_c.default().env == 'prod') ? 'Login failed' : 'Invalid 2FA Token', success : false })
                        }
                    } else {
                        entities.fetchFromDB(cli._c, user.username, userObj => {
                            log("Auth", "Login with credentials success with user " + user.username, "lilium");
                            loginSuccess(cli, userObj);
                        });
                    }
                } else {
                    hooks.fire('user_login_failed', cli);
                    log("Auth", "Login attempt failed with user " + usr + " and non-hash " + psw, "warn");
                    cli.sendJSON({ error : "credentials", message: 'Login Failed', success : false })
                }
            });
		} else {
            cli.throwHTTP(404, undefined, true);
        }
	};

	registerLoginForm () {

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
