var log = require('./log.js');
var db = require('./includes/db.js');

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

		db.findToArray('uploads', {"id_" : entity.avatarID}, function(err, avatar) {
			entity.avatarURL = err || avatar.length == 0 ? "" : avatar[0].url;
			callback(entity);
		});
	};

	this.fetchFromDB = function(idOrUsername, callback) {
		var condition = new Array();
		condition[(isNaN(idOrUsername) ? "_id" : "username")] = (isNaN(idOrUsername) ? db.mongoID(idOrUsername) : idOrUsername);
		
		db.findToArray('entities', condition, function(err, user) {
			if (!err && user.length == 1) {
				entityWithData(user, callback);
			} else {
				callback(undefined);
			}
		});
	};

	this.createEmptyEntity = function() {
		return new Entity();
	};

	this.validateEntityObject = function(e) {
		return e.username != "" && e.shhh != "" && e.email != "" && e.displayname != "";
	};

	this.registerEntity = function(entity, callback) {
		if (this.validateEntityObject(entity)) {
			db.insert('entities', entity, callback, true);
		} else {
			callback("[EntityValidationException] Entity object misses required fields.", undefined);
		}
	};

	this.updateEntity = function(valObject) {
		
	};

	this.cacheRoles = function(callback) {
		log('Roles', 'Caching roles from Database');
		db.findToArray('roles', {}, function(err, roles) {
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
			throw "[RolesException] Could not promote unexisting role " + roleName;
		} else {
			Roles[roleName].rights.push(right);
			db.update('roles', {rights: Roles[roleName].rights }, cb);
		}
	};

	this.registerRole = function(rObj, rights, callback) {
		if (typeof Roles[rObj.name] !== 'undefined') {
			throw "[RolesException] Tried to register already registered role " + rObj.name;
		} else {
			rObj.rights = rights;
			db.insert('roles', rObj, function(err, result) {
				Roles[rObj.name] = rObj;
				callback(rObj);
			});
		}
	};

	this.isAllowed = function(entity, right) {
		var allowed = entity.roles.indexOf('lilium') !== -1;

		if (!allowed) {
			for (var i = 0, len = entity.roles.length; i < len; i++) {
				var rights = Roles[entity.roles[i]];
	
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

		return allowed;
	};
	
	var init = function() {

	};

	init();
};

module.exports = new Entities();
