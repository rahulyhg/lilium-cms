const db = require('../lib/db.js');
const CryptoJS = require('crypto-js');
const _c = require('../lib/config');
const entities = require('../lib/entities.js');
const hooks = require('../lib/hooks');
const sessions = require('../lib/session.js');

const api = require('../pipeline/api.js');
const metrics = require('../lib/metrics');
const twoFactor = require('../lib/twoFactor');
const padlock = require('../lib/padlock');
const dateformat = require('dateformat');

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
                            status: 'success',
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
        db.findUnique(require('../lib/config').default(), 
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

                db.update(require('../lib/config').default(), 'entities', {_id : user._id}, { magiclink : CryptoJS.SHA256(Math.random()).toString() }, () => {});
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
            const lockkey = usr + cli.request.headers["user-agent"];
            padlock.isUserLocked(lockkey, locked => {
                if (locked) {
                    metrics.plus('failedauth');
                    cli.sendJSON({  success : false, status: 'error', error: 'toomanyattempts', until : locked, message : 'Blocked until ' + dateformat(new Date(locked), 'HH:MM') });
                } else {
                    db.findUnique(_c.default(), 'entities', conds, (err, user) => {
                        if (!err && user) {
                            if (user.blockedUntil && user.blockedUntil > Date.now()) {
                            } else {
                                entities.fetchFromDB(cli._c, user.username, userObj => {
                                    if (user.enforce2fa && user.confirmed2fa) {
                                        if (token2fa && twoFactor.validate2fa(user._id.toString(), token2fa)) {
                                            entities.fetchFromDB(cli._c, user.username, userObj => {
                                                log("Auth", "Login with credentials and 2FA success with user " + user.username, "lilium");
                                                loginSuccess(cli, userObj);
                                            });
                                        } else {
                                            cli.sendJSON({ success : true,  status: '2fachallenge', message: 'Two factor authentication is enabled and 2FA token is required' })
                                        }
                                    } else {
                                        log("Auth", "Login with credentials success with user " + user.username, "lilium");
                                        loginSuccess(cli, userObj);
                                    }
                                });
                            }
                        } else {
                            padlock.loginFailed(lockkey, blocked => {
                                metrics.plus('failedauth');
                                hooks.fire('user_login_failed', cli);
                                log("Auth", "Login attempt failed with user " + usr + " and non-hash " + psw, "warn");
                                cli.sendJSON({  success : false, status: 'error', error : "credentials", blocked, message: 'Login Failed' })
                            });
                        }
                    });
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
