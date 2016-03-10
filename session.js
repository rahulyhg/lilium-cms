var _c = require('./config.js');
var entities = require('./entities.js');
var db = require('./includes/db.js');
var log = require('./log.js');

var _sesh = new Object();


var UserSesh = function(token) {
	this.data = new Object();
	this.token = token || "";
	this.loggedin;
};

var Sessions = function() {
	this.createToken = function(prefix) {
  		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}

		return (prefix || "") + s4() + s4() + s4() + s4() +
				s4() + s4() + s4() + s4();
	};

	this.createSession = function() {
		var token = this.createToken(new Date().getTime());
		var newSesh = new UserSesh(token);
		return newSesh;
	};

    this.logout = function(cli) {
        this.removeSession(cli, function() {
            cli.response.setHeader('Set-Cookie', 'lmlsid=""');
            cli.redirect(cli._c.server.url + '/admin');
        })
    }

	this.setCookieToCli = function(cli) {
		cli.response.setHeader('Set-Cookie', 'lmlsid=' + cli.session.token);
	};

	this.injectSessionInCli = function(cli) {
		var curSesh = _sesh[cli.cookies.lmlsid];

		if (cli.cookies.lmlsid && curSesh) {
			cli.session = curSesh;

			cli.userinfo = {
				loggedin : cli.session.loggedin,
				roles : cli.session.data.roles,
				userid : cli.session.data._id,
				logintime : cli.session.data.logintime,
				displayname : cli.session.data.displayname,
				admin : cli.session.data.admin,
				god : cli.session.data.god,
				user : cli.session.data.user,
			};
		} else {
			cli.session = new UserSesh();
		}
	};

	this.createSessionInCli = function(cli, userObj) {
		cli.session = this.createSession();
		_sesh[cli.session.token] = cli.session;
		cli.session.loggedin = true;

		for (var k in userObj) {
			cli.session.data[k] = userObj[k];
		}

		cli.session.data.admin = entities.isAllowed(userObj, 'admin');
		cli.session.data.god = entities.isAllowed(userObj, 'lilium');
		cli.session.data.user = userObj.username;

		cli.userinfo = cli.session.data;

		// Load notifications in db
		db.findToArray(_c.default(), 'notifications', {userID : db.mongoID(cli.session.data._id)},function(err, arr) {
			cli.session.data.notifications = arr.slice(0,4);
		});
		cli.session.data.notifications = [];

		this.setCookieToCli(cli);

		// No need for callback
		db.insert(_c.default(), 'sessions', cli.session, function() {

		});
	};

    this.removeSession = function(cli, callback) {
        // Remove session from db
        db.remove(_c.default(), 'sessions', {token: cli.session.token}, function() {
            // Remove from memory
            _sesh[cli.session.token] = undefined;
            delete _sesh[cli.session.token];

            callback();
        });
    }

	this.saveSession = function(cli, callback) {
		db.update(_c.default(), 'sessions', {token:cli.session.token}, cli.session, callback);
	};

    this.getSessionFromSID = function(sid) {
        return _sesh[sid];
    };

	this.getSessions = function() {
		return _sesh;
	};

	this.initSessionsFromDatabase = function(cb) {
		var seshCount = 0;
		db.find(_c.default(), 'sessions', {}, {}, function(err, data) {
			if (!err) {
				var fetchNext = function() {
					data.hasNext(function(err, hasNext) {
						if (hasNext) {
							seshCount++;
							data.next(function(err, sesh) {
								_sesh[sesh.token] = sesh;
								fetchNext();
							});
						} else {
							log("Session", "Loaded " + seshCount + " sessions from databse");
							cb();
						}
					});
				}
				fetchNext();
			} else {
				cb();
			}
		});
	};
};

module.exports = new Sessions();
