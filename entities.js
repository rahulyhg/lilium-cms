var _c = require('./config.js');
var log = require('./log.js');
var db = require('./includes/db.js');
var filelogic = require('./filelogic.js');
var formbuilder = require('./formBuilder.js');
var CryptoJS = require('crypto-js');
var livevars = require('./livevars.js');
var mailer = require('./postman.js');
var imageResizer = require('./imageResizer.js');

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

var Entities = module.exports = new function() {
    var entityWithData = function(oData, callback) {
        var entity = new Entity();

        for (var key in oData) {
            entity[key] = oData[key];
        }

        callback(entity);
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
        if (cli.routeinfo.path[1] == 'me') {
            switch (cli.routeinfo.path[2]) {
                case undefined:
                    this.updateProfile(cli);
                case "update_profile_picture":
                    this.updateProfilePicture(cli);
                    break;
                case "change_password":
                    this.changePassword(cli);
                    break;
            }
        } else {
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
        }

    };

    this.updateProfile = function(cli) {
        cli.touch('entities.updateProfile');
        var entData = cli.postdata.data;
        var entitie = this.initialiseBaseEntity(entData);
        entitie._id = cli.
        this.updateProfile(cli);

    };

    this.updateProfilePicture = function(cli) {
        var form = formbuilder.handleRequest(cli);
        var response = formbuilder.validate(form, true);

        if (response.success) {

            var image = formbuilder.serializeForm(form);
            var extensions = image.picture.split('.');
            var mime = extensions[extensions.length - 1];
            var saveTo = cli._c.server.base + "backend/static/uploads/" + image.picture;

            if (cli._c.supported_pictures.indexOf('.' + mime) != -1) {

                imageResizer.resize(saveTo, image.picture, mime, cli, function(images){

					var avatarURL = cli._c.server.url + '/uploads/' + image.picture;
					var avatarID = image.picture.substring(0, image.picture.lastIndexOf('.'));
                    // Save it in database
                    db.update(cli._c, 'entities', {_id : cli.userinfo.userid}, {avatarURL : avatarURL, avatarID : avatarID}, function (err, result){

                        // Update session
                        var sessionManager = require('./session.js');
						var sessToken = cli.session.token;
						var session = sessionManager.getSessionFromSID(sessToken);

                        session.data.avatarID = avatarID;
						session.data.avatarURL = avatarURL;

						cli.session.data.avatarURL = avatarURL;
						cli.session.data.avatarID = avatarID;

						sessionManager.saveSession(cli, function() {

							cli.sendJSON({
	                            redirect : '',
	                            success : true
	                        });
						});
                    });

                });
            } else {
                cli.sendJSON({
                    form: response
                });
            }
            // var url = conf.default.server.url + "/uploads/" + cli.postdata.uploads[0].url;
            // Create post

        } else {
            cli.sendJSON({
                msg: 'Invalid file type'
            });
        }
    };

    this.changePassword = function(cli) {
        var form = formbuilder.handleRequest(cli);
        var response = formbuilder.validate(form, true);

        if (response.success) {
            form = formbuilder.serializeForm(form);
            var shhh = CryptoJS.SHA256(form.password).toString(CryptoJS.enc.Hex);
            db.update(cli._c, 'entities', {
                _id: cli.userinfo.userid
            }, {
                shhh: shhh
            }, function(err, result) {
                cli.refresh();
            });
        } else {
            cli.sendJSON({
                msg: response
            });
        }
    }

    this.maxPower = function(cli, callback) {
        db.aggregate(cli._c, 'entities', [{
            "$unwind": "$roles"
        }, {
            $lookup: {
                from: 'roles',
                localField: 'roles',
                foreignField: 'name',
                as: 'rights'
            }
        }, {
            $match: {
                '_id': db.mongoID(cli.userinfo._id ? cli.userinfo._id : cli.userinfo.userid)
            }
        }, {
            $group: {
                _id: '$_id',
                power: {
                    $push: "$rights.power"
                }
            }
        }, {
            $project: {
                _id: 0,
                power: {
                    $min: '$power'
                }
            }
        }], function(result) {
			// Make sure there is a result
			if (result[0] && result[0].power[0]) {
				// Pull out the result
				callback(result[0].power[0]);
			} else {
				// Poorest power
				callback(999);
			}

        });
    }

    this.update = function(cli) {


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
    }

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
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath);
        });
    };

    this.deleteFromCli = function(cli) {
        var id = cli.postdata.data.uid;

        db.remove(cli._c, 'entities', {
            _id: db.mongoID(id)
        }, function(err, result) {
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath);
        });
    };

    this.createEmptyEntity = function() {
        return new Entity();
    };

    this.validateEntityObject = function(e, cli, cb) {
		var valid = true;
		valid = e.username != "" && e.shhh != "" && e.email != "" && e.displayname != "" && e.role;
		 cli.hasEnoughPower(e.roles, function(hasEnoughPower) {
             valid = hasEnoughPower;
             cb(valid);
         });
    };

    this.registerEntity = function(cli, entity, callback) {
        this.validateEntityObject(entity, cli, function(valid) {
            if (valid) {
                db.insert(cli._c, 'entities', entity, callback, true);

            } else {
                callback("[EntityValidationException] Entity object misses required fields.", undefined);

            }
        });
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
            db.update(_c.default(), 'roles', {
                rights: Roles[roleName].rights
            }, cb);
        }
    };

    this.registerRole = function(rObj, rights, callback, updateIfExists) {
        if (typeof Roles[rObj.name] !== 'undefined') {
            throw new Error("[RolesException] Tried to register already registered role " + rObj.name);
        } else {
            rObj.rights = rights;
            db.update(_c.default(), 'roles', {
                name: rObj.name
            }, rObj, function(err, result) {
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

        formbuilder.createForm('entity_create')
            .addTemplate('entity_create');


        formbuilder.createForm('update_entitiy')
            .addTemplate('entity_create')
            .remove('password')
            .edit('create', '', {
                value: 'Update Profile'
            });

        formbuilder.createForm('update_password', {
                action: '/admin/me/change_password'
            })
            .add('editpasswd', 'title', {
                displayname: 'Edit Password'
            })
            .add('password', 'password')
            .add('update', 'submit');

        formbuilder.createForm('upload_profile_picture', {
                action: '/admin/me/update_profile_picture'
            })
            .add('uppicutre', 'title', {
                displayname: 'Upload a profile picture'
            })
            .add('picture', 'file', {
                displayname: 'Profile Picture'
            })
            .add('upload', 'submit', {
                value: 'Upload'
            });
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
                qObj.roles = queryInfo.roles ? {
                    $in: queryInfo.roles
                } : undefined;
                qObj.username = queryInfo.username;

                db.findToArray(cli._c, 'entities', queryInfo, function(err, arr) {
                    callback(err || arr);
                });
            } else {
                db.multiLevelFind(cli._c, 'entities', levels, {
                    username: levels[0]
                }, {
                    limit: [1]
                }, callback);
            }
        }, ["entities"]);

        livevars.registerLiveVariable('me', function(cli, levels, params, callback) {
            db.findToArray(cli._c, 'entities', {
                _id: db.mongoID(cli.userinfo.userid)
            }, function(err, arr) {
                callback(err || arr);
            });
        }, []);

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
                    _id: dat._id,
                    admin: dat.admin,
                    avatarURL: dat.avatarURL,
                    displayname: dat.displayname,
                    roles: dat.roles,
                    power: dat.power,
                    username: dat.username,
                    notifications: dat.notifications === 'undefined' ? [] : dat.notifications,
                    newNotifications: dat.newNotifications === 'undefined' ? 0 : dat.newNotifications
                }
            }

            callback(dat);
        }, []);
    };

    var init = function() {

    };

    init();
};
