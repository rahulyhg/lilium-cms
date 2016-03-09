var _c = require('./config.js');
var log = require('./log.js');
var db = require('./includes/db.js');
var filelogic = require('./filelogic.js');
var formbuilder = require('./formBuilder.js');
var CryptoJS = require('crypto-js');
var livevars = require('./livevars.js');
var mailer = require('./postman.js');

var Roles = new Object();

var Entity = function() {
	// Manda fields
	this._id = undefined;
	this.username = "";
	this.shhh = "";
	this.email = "";
	this.roles = new Array();
	this.displayname = "";
	this.avatarID = -1;
	this.avatarURL = "";
	this.createdOn = undefined;

	// Various data; should always be checked for undefined
	this.data = new Object();
};

var Entities = function() {
	var entityWithData = function(oData, callback) {
		var entity = new Entity();

		for (var key in oData) {
			entity[key] = oData[key];
		}

		db.findToArray(_c.default(), 'uploads', {"id_" : entity.avatarID}, function(err, avatar) {
			entity.avatarURL = err || avatar.length == 0 ? "" : avatar[0].url;
			callback(entity);
		});
	};

	this.fetchFromDB = function(conf, idOrUsername, callback) {
		var condition = new Object();

		if (typeof idOrUsername === "object") {
			condition["_id"] = db.mongoID(idOrUsername);
		} else {
			condition.username = idOrUsername;
		}

		db.findToArray(conf, 'entities', condition, function(err, user) {
			if (!err && user.length == 1) {
				entityWithData(user[0], callback);
			} else {
				callback(undefined);
			}
		});
	};


	this.handleGET = function(cli) {
		cli.touch('entities.handleGET');

		if (cli.routeinfo.path.length == 2) {
			filelogic.serveAdminLML(cli);
		} else {
			var action = cli.routeinfo.path[2];

			switch (action) {
				case "edit":
					this.serveEdit(cli);
					break;

				default:
        				return cli.throwHTTP(404, 'Not Found');
        				break;
			}
		}
	};

	this.handlePOST = function(cli) {
		cli.touch('entities.handlePOST');
		var action = cli.postdata.data.form_name;

		switch (action) {
			case "entity_create":
				this.createFromCli(cli);
				break;

			case "entity_delete":
				this.deleteFromCli(cli);
				break;

			default:
				cli.debug();
		}
	};

	this.serveEdit = function(cli) {
		cli.touch('entities.serveEdit');

		cli.debug();
	};

	this.initialiseBaseEntity = function(entData) {
		var newEnt = this.createEmptyEntity();

		newEnt.username = entData.username;
		newEnt.shhh = CryptoJS.SHA256(entData.password).toString(CryptoJS.enc.Hex);
		newEnt.email = entData.email;
		newEnt.roles.push(entData.roles);
		newEnt.displayname = entData.displayname;
		newEnt.firstname = entData.firstname;
		newEnt.lastname = entData.lastname;
		newEnt.createdOn = new Date();

		if (typeof newEnt.meta === "object") {
			for (var key in newEnt.meta) {
				newEnt.data[key] = newEnt.meta[key];
			}
		}
		return newEnt;
	}

	this.createFromCli = function(cli) {
		cli.touch('entities.createFromCli');
		var entData = cli.postdata.data;
		var newEnt = this.initialiseBaseEntity(entData);

		this.registerEntity(cli, newEnt, function() {
			cli.touch('entities.registerEntity.callback');
			/*
			mailer.createEmail({
				to: [newEnt.email],
				from: _c.default.emails.default,
				subject: "Your account has been Created",
				html: 'welcome.lml'
			},true, function() {

			}, {name:newEnt.firstname + " " + newEnt.lastname});
			*/
			cli.redirect(cli._c.server.url + cli.routeinfo.fullpath);
		});
	};

	this.deleteFromCli = function(cli) {
		var id = cli.postdata.data.uid;

		db.remove(cli._c, 'entities', {_id:db.mongoID(id)}, function(err, result) {
			cli.redirect(cli._c.server.url + cli.routeinfo.fullpath);
		});
	};

	this.createEmptyEntity = function() {
		return new Entity();
	};

	this.validateEntityObject = function(e) {
		return e.username != "" && e.shhh != "" && e.email != "" && e.displayname != "";
	};

	this.registerEntity = function(cli, entity, callback) {
		if (this.validateEntityObject(entity)) {
			db.insert(cli._c, 'entities', entity, callback, true);
		} else {
			callback("[EntityValidationException] Entity object misses required fields.", undefined);
		}
	};

	this.updateEntity = function(valObject) {

	};

	this.cacheRoles = function(callback) {
		log('Roles', 'Caching roles from Database');
		db.findToArray(_c.default(), 'roles', {}, function(err, roles) {
			if (!err) {
				for (var i = 0, len = roles.length; i < len; i++) {
					Roles[roles[i].name] = roles[i];
				}

				log('Roles', 'Cached ' + roles.length + ' roles');
			} else {
				log('Roles', 'Could not cache roles from database');
			}

			callback();
		});
	};

	this.promoteRole = function(roleName, right, cb) {
		if (typeof Roles[roleName] === 'undefined') {
			throw new Error("[RolesException] Could not promote unexisting role " + roleName);
		} else {
			Roles[roleName].rights.push(right);
			db.update(_c.default(), 'roles', {rights: Roles[roleName].rights }, cb);
		}
	};

	this.registerRole = function(rObj, rights, callback, updateIfExists) {
		if (typeof Roles[rObj.name] !== 'undefined') {
			throw new Error("[RolesException] Tried to register already registered role " + rObj.name);
		} else {
			rObj.rights = rights;
			db.update(_c.default(), 'roles', {name: rObj.name} ,rObj, function(err, result) {
				Roles[rObj.name] = rObj;
				callback(rObj);
			}, updateIfExists);
		}
	};

	this.isAllowed = function(entity, right) {
		var allowed = false;
		var that = this;

		if (!entity.loggedin && (right === "" || right.length === 0)) {
			allowed = true;
		} else if (typeof right === "object" && typeof right.length !== 'undefined') {
			var rights = right;
			if (right.length === 0) {
				allowed = true;
			} else {
				for (var i = 0; i < rights.length; i++) {
					allowed = that.isAllowed(entity, rights[i]);

					if (!allowed) break;
				}
			}
		} else if (typeof right === "string" && typeof entity.roles !== 'undefined') {
			allowed = entity.roles.indexOf('lilium') !== -1;

			if (!allowed) {
				for (var i = 0, len = entity.roles.length; i < len; i++) {
                    if (typeof Roles[entity.roles[i]] !== 'undefined') {
                        var rights = Roles[entity.roles[i]].rights;
    					if (typeof rights !== 'undefined') {
    						for (var j = 0, jLen = rights.length; j < jLen; j++) {
    							if (rights[j] == right) {
    								allowed = true;
    								break;
    							};
    						}

    					}
    					if (allowed) break;
                    }

				}

			}

		}
		return allowed;
	};

	this.registerCreationForm = function() {
		formbuilder.registerFormTemplate('entity_create')
			.add('username', 'text', {displayname:"Username"})
			.add('password', 'password', {displayname:"Password"})
			.add('firstname', 'text', {displayname:"First name"})
			.add('lastname', 'text', {displayname:"Last name"})
			.add('email', 'text', {displayname:"Email"})
			.add('displayname', 'text', {displayname:"Display name"})
			.add('roles', 'livevar', {
				endpoint : 'roles',
				tag : 'select',
				template : 'option',
				title : 'role',
				props : {
					'value' : 'name',
					'html' : 'displayname',
					'header' : 'Select One',
				},
				displayname: "Initial role"
			})
			.add('create', 'submit');

			formbuilder.createForm('entity_create')
				.addTemplate('entity_create');
	};

	this.registerLiveVars = function() {
		livevars.registerLiveVariable('entities', function(cli, levels, params, callback) {
			var allEntities = levels.length === 0;

			if (allEntities) {
				db.singleLevelFind(cli._c, 'entities', callback);
			} else if (levels[0] == 'query') {
				var queryInfo = params.query || new Object();
				var qObj = new Object();

				qObj._id = queryInfo._id;
				qObj.displayname = queryInfo.displayname;
				qObj.email = queryInfo.email;
				qObj.roles = queryInfo.roles ? {$in : queryInfo.roles} : undefined;
				qObj.username = queryInfo.username;

				db.findToArray(cli._c,'entities', queryInfo, function(err, arr) {
					callback(err || arr);
				});
			} else {
				db.multiLevelFind(cli._c, 'entities', levels, {username:levels[0]}, {limit:[1]}, callback);
			}
		}, ["entities"]);

		livevars.registerLiveVariable('roles', function(cli, levels, params, callback) {
			var roleArr = new Array();
			for (var key in Roles) {
				roleArr.push(Roles[key]);
			}
			callback(roleArr);
		}, ["roles"]);

		livevars.registerLiveVariable('session', function(cli, levels, params, callback) {
			var dat = cli.session.data;
			if (levels.length) {
				for (var i = 0; i < levels.length; i++) {
					if (levels[i] == "shhh") {
						dat = "[SessionLiveVarException] Tried to fetch entity's secret";
						break;
					} else {
						dat = dat[levels[i]];
					}
				}
			} else {
				dat = {
					_id : dat._id,
					admin : dat.admin,
					avatarURL : dat.avatarURL,
					displayname : dat.displayname,
					roles : dat.roles,
					username : dat.username,
					notifications : dat.notifications === 'undefined' ? [] : dat.notifications,
					newNotifications : dat.newNotifications === 'undefined' ? 0 : dat.newNotifications
				}
			}

			callback(dat);
		}, []);
	};

	var init = function() {

	};

	init();
};

module.exports = new Entities();
