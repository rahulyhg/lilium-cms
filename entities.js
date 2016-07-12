var _c = require('./config.js');
var log = require('./log.js');
var db = require('./includes/db.js');
var filelogic = require('./filelogic.js');
var formbuilder = require('./formBuilder.js');
var CryptoJS = require('crypto-js');
var livevars = require('./livevars.js');
var mailer = require('./postman.js');
var imageResizer = require('./imageResizer.js');
var tableBuilder = require('./tableBuilder.js');
var hooks = require('./hooks.js');
var pluginHelper = require('./pluginHelper.js');
var preferences = require('./preferences.js');

var Roles = new Object();

var Entity = function () {
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
    this.preferences = new Object();

    // Various data; should always be checked for undefined
    this.data = new Object();
};

var Entities = module.exports = new function () {
    var entityWithData = function (oData, callback) {
        var entity = new Entity();

        for (var key in oData) {
            entity[key] = oData[key];
        }

        callback(entity);
    };

    this.getCachedRoles = function() {
        return Object.assign({}, Roles);
    }

    this.fetchFromDB = function (conf, idOrUsername, callback) {
        var condition = new Object();

        if (typeof idOrUsername === "object") {
            condition["_id"] = db.mongoID(idOrUsername);
        } else {
            condition.username = idOrUsername;
        }

        db.findToArray(conf, 'entities', condition, function (err, user) {
            if (!err && user.length == 1) {
                entityWithData(user[0], callback);
            } else {
                callback(undefined);
            }
        });
    };


    this.handleGET = function (cli) {
        cli.touch('entities.handleGET');

        if (cli.routeinfo.path.length == 2) {
            filelogic.serveAdminLML(cli);
        } else {
            var action = cli.routeinfo.path[2];

            switch (action) {
            case "edit":
                this.serveEdit(cli);
                break;

            case "new":
                this.serveNew(cli);
                break;

            default:
                return cli.throwHTTP(404, 'Not Found');
                break;
            }
        }
    };

    this.handlePOST = function (cli) {
        cli.touch('entities.handlePOST');
        if (cli.routeinfo.path[1] == 'me') {
            switch (cli.postdata.data.form_name) {
            case "update_entitiy":
                this.updateProfile(cli);
                break;
            case "upload_profile_picture":
                this.updateProfilePicture(cli, true);
                break;
            case "update_password":
                this.changePassword(cli, true);
                break;
            default:
                cli.throwHTTP(401);
                break;
            }
        } else if (cli.routeinfo.path[2] == 'edit') {
            if (cli.hasRight('user_management')) {

            var action = cli.postdata.data.form_name;
            switch (action) {
                case "update_entitiy":
                    this.update(cli);
                    break;
                case "update_password":
                    this.changePassword(cli, false);
                    break;
                case "upload_profile_picture":
                    this.updateProfilePicture(cli, false);
                    break;
                }
            } else {
                cli.throwHTTP(401);
            }
        } else {
            if (cli.hasRight('user_management')) {
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
            } else {
                cli.throwHTTP(401);
            }
        }

    };

    this.updateProfile = function (cli) {
        cli.touch('entities.updateProfile');
        var entData = cli.postdata.data;
        var entity = this.initialiseBaseEntity(entData);

        entity._id = cli.userinfo.userid;

        this.updateEntity(entity, cli._c.id, function(err, res) {
            if (!err){
                cli.refresh();
            } else {
                log('[Database] error while updating entity :');
                cli.throwHTTP(500);
            }
        });

    };

    this.updateProfilePicture = function (cli, isProfile) {
        log('Entities', 'Handling entity picture upload');
        var form = formbuilder.handleRequest(cli);
        var response = formbuilder.validate(form, true);

        if (response.success) {

            var image = formbuilder.serializeForm(form);
            var extensions = image.picture.split('.');
            var mime = extensions[extensions.length - 1];
            var saveTo = cli._c.server.base + "backend/static/uploads/" + image.picture;

            if (cli._c.supported_pictures.indexOf('.' + mime) != -1) {

                imageResizer.resize(saveTo, image.picture, mime, cli, function (images) {
                    var avatarURL = images.medium.url;
                    var avatarID = image.picture.substring(0, image.picture.lastIndexOf('.'));
                    var id = isProfile ? cli.userinfo.userid : cli.routeinfo.path[3];
                    var sessionManager = require('./session.js');

                    // Save it in database
                    db.update(cli._c, 'entities', {
                        _id: db.mongoID(id)
                    }, {
                        avatarURL: avatarURL,
                        avatarID: avatarID
                    }, function (err, result) {
                        // Update session
                        if (isProfile) {
                            var sessToken = cli.session.token;
                            var session = sessionManager.getSessionFromSID(sessToken);

                            session.data.avatarID = avatarID;
                            session.data.avatarURL = avatarURL;

                            cli.session.data.avatarURL = avatarURL;
                            cli.session.data.avatarID = avatarID;

                            hooks.fire('profile_picture_updated', {
                                cli: cli
                            });

                            sessionManager.saveSession(cli, function () {
                                cli.sendJSON({
                                    success: true
                                });
                            });
                        } else {
                            db.findToArray(cli._c, 'sessions', {"data._id" : db.mongoID(id)}, function(err, arr){
                                if (arr[0] && arr[0].token) {

                                    var session = sessionManager.getSessionFromSID(arr[0].token);

                                    if (session) {
                                        session.data.avatarID = avatarID;
                                        session.data.avatarURL = avatarURL;

                                        cli.session.data.avatarURL = avatarURL;
                                        cli.session.data.avatarID = avatarID;

                                        // Bypass session manager taking only a cli
                                        var dummycli = {};
                                        dummycli.session = session;
                                        dummycli._c = {};
                                        dummycli._c.id = cli._c.id;

                                        // Save it
                                        sessionManager.saveSession(dummycli, function () {
                                            cli.sendJSON({
                                                redirect: '',
                                                success: true
                                            });
                                        });
                                    }
                                } else {
                                    cli.sendJSON({
                                        redirect: '',
                                        success: true
                                    });
                                }
                            });
                        }

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

    this.changePassword = function (cli, profile) {
        var form = formbuilder.handleRequest(cli);
        var response = formbuilder.validate(form, true);

        if (response.success) {
            form = formbuilder.serializeForm(form);
            var shhh = CryptoJS.SHA256(form.password).toString(CryptoJS.enc.Hex);
            var id = profile ? cli.userinfo.userid : cli.routeinfo.path[3];

            db.update(cli._c, 'entities', {
                _id: db.mongoID(id)
            }, {
                shhh: shhh
            }, function (err, result) {
                cli.refresh();
            });
        } else {
            cli.sendJSON({
                msg: response
            });
        }
    }

    this.maxPower = function (cli, callback) {
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
        }], function (result) {
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

    this.update = function (cli) {
        if (cli.hasRight('entities_management')) {
            var entData = cli.postdata.data;
            var entity = this.initialiseBaseEntity(entData);

            entity._id = cli.routeinfo.path[3];
            this.updateEntity(entity, cli._c.id, function(err, res) {
                if (!err){
                    cli.refresh();
                } else {
                    log('[Database] error while updating entity :');
                    cli.throwHTTP(500);
                }
            });
        } else {
            cli.throwHTTP(401);
        }

    }

    this.serveEdit = function (cli) {
        cli.touch('entities.serveEdit');
        filelogic.serveAdminLML(cli, true);
    };

    this.serveNew = function (cli) {
        cli.touch('entities.serveNew');
        filelogic.serveAdminLML(cli);
    };

    this.initialiseBaseEntity = function (entData) {
        var newEnt = this.createEmptyEntity();

        newEnt.username = entData.username;
        newEnt.shhh = CryptoJS.SHA256(entData.password).toString(CryptoJS.enc.Hex);
        newEnt.email = entData.email;
        newEnt.description = entData.description || '';
        newEnt.roles = [];
        for (var index in entData.roles) {
            if (entData.roles[index] !== "") {
                newEnt.roles.push(entData.roles[index]);
            }
        }
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

    this.createFromCli = function (cli) {
        cli.touch('entities.createFromCli');
        var entData = cli.postdata.data;
        var newEnt = this.initialiseBaseEntity(entData);

        this.registerEntity(cli, newEnt, function () {

            hooks.fire('entity_created', {
                cli: cli
            });

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

    this.deleteFromCli = function (cli) {
        var id = cli.postdata.data.uid;

        db.remove(cli._c, 'entities', {
            _id: db.mongoID(id)
        }, function (err, result) {

            hooks.fire('entity_deleted', {
                id: id
            });

            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath);
        });
    };

    this.createEmptyEntity = function () {
        return new Entity();
    };

    this.validateEntityObject = function (e, cli, cb) {
        var valid = true;
        valid = e.username != "" && e.shhh != "" && e.email != "" && e.displayname != "" && e.role;
        cli.hasEnoughPower(e.roles, function (hasEnoughPower) {
            valid = hasEnoughPower;
            cb(valid);
        });
    };

    this.registerEntity = function (cli, entity, callback) {
        this.validateEntityObject(entity, cli, function (valid) {
            if (valid) {
                db.insert(cli._c, 'entities', entity, callback, true);

            } else {
                callback("[EntityValidationException] Entity object misses required fields.", undefined);

            }
        });
    };

    this.updateEntity = function (valObject, siteid, cb) {
        var id = db.mongoID(valObject._id);
        // Removing properties we don't want to edit
        valObject.username = undefined;
        valObject.shhh = undefined;
        delete valObject.username;
        delete valObject.shhh;
        delete valObject._id;
        delete valObject.createdOn;

        db.update(siteid, 'entities', {_id : id}, valObject, cb);
    };

    this.cacheRoles = function (callback) {
        log('Roles', 'Caching roles from Database');
        var sites = _c.getAllSites();
        for (var i in sites) {
            db.findToArray(sites[i], 'roles', {$or : [{'pluginID': false}, {'pluginID': null}]}, function (err, roles) {
                if (!err) {
                    for (var i = 0, len = roles.length; i < len; i++) {
                        Roles[roles[i].name] = roles[i];
                    }

                    log('Roles', 'Cached ' + roles.length + ' roles');
                } else {
                    log('Roles', 'Could not cache roles from database');
                }

            });
        }
        callback();


    };

    this.promoteRole = function (roleName, right, cb) {
        if (typeof Roles[roleName] === 'undefined') {
            log('Roles', new Error("[RolesException] Could not promote unexisting role " + roleName));
        } else {
            Roles[roleName].rights.push(right);
            db.update(_c.default(), 'roles', {
                rights: Roles[roleName].rights
            }, cb);
        }
    };

    this.registerRole = function (rObj, rights, callback, updateIfExists, allsites) {
        if (typeof Roles[rObj.name] !== 'undefined') {
            log('Roles', new Error("[RolesException] Tried to register already registered role " + rObj.name));
        } else {
            rObj.pluginID = pluginHelper.getPluginIdentifierFromFilename(__caller, undefined, true);
            rObj.rights = rights;
            if (allsites) {
                var sites = _c.getAllSites();
                for (var i in sites) {
                    db.update(sites[i], 'roles', {
                        name: rObj.name
                    }, rObj, function (err, result) {
                        Roles[rObj.name] = rObj;
                        callback(rObj);
                    }, updateIfExists);
                }
            } else {
                db.update(_c.default(), 'roles', {
                    name: rObj.name
                }, rObj, function (err, result) {
                    Roles[rObj.name] = rObj;
                    callback(rObj);
                }, updateIfExists);
            }

        }
    };

    this.isAllowed = function (entity, right) {
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

    var registerTables = function () {
        tableBuilder.createTable({
            name: 'entities',
            endpoint: 'entities.table',
            paginate: true,
            searchable: true,
            max_results: 25,
            fields: [{
                key: 'avatarURL',
                displayname: 'Profile Picture',
                template: 'table-entity-profile',
                sortable: false
            }, {
                key: 'username',
                displayname: 'Username',
                sortable: true
            }, {
                key: 'displayname',
                displayname: 'Display Name',
                sortable: true,
            }, {
                key: 'email',
                displayname: 'Email',
                sortable: true
            }, {
                key: 'roles',
                displayname: 'Roles',
                template: 'table-entity-roles',
                sortable: false
            }, {
                key: '',
                displayname: 'Actions',
                template: 'table-entity-actions',
                sortable: false
            }]
        });
    };

    this.registerCreationForm = function () {

        formbuilder.createForm('entity_create', {
               fieldWrapper : "lmlform-fieldwrapper"
            })
            .addTemplate('entity_create');


        formbuilder.createForm('update_entitiy', {
                fieldWrapper : "lmlform-fieldwrapper"
            })
            .addTemplate('entity_create')
            .remove('password')
            .edit('username', '', {
                disabled : true
            })
            .add('description', 'text', {displayname: 'BIO'}, {required:false})
            .edit('create', '', {
                value: 'Update Profile'
            });

        formbuilder.createForm('update_password', {
                fieldWrapper : "lmlform-fieldwrapper"
            })
            .add('editpasswd', 'title', {
                displayname: 'Edit Password'
            })
            .add('password', 'password')
            .add('update', 'submit');

        formbuilder.createForm('upload_profile_picture',{
                fieldWrapper : "lmlform-fieldwrapper"
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

    this.registerLiveVars = function () {
        livevars.registerLiveVariable('entities', function (cli, levels, params, callback) {
            var allEntities = levels.length === 0;

            if (allEntities) {
                if (cli.hasRight('list-all-entities')) {
                    db.singleLevelFind(cli._c, 'entities', callback);
                } else {
                    db.findToArray(cli._c, 'entities', {
                        _id : db.mongoID(cli.session.data._id)
                    }, function(err, arr) {
                        callback(arr);
                    });
                }
            } else if (levels[0] == "simple") {
                var simpProj = {
                    displayname : 1,
                    _id : 1
                };
            
                if (cli.hasRight('list-entities')) {
                    db.findToArray(cli._c, 'entities', {}, function(err, arr) {
                        callback(arr);
                    }, simpProj);
                } else {
                    db.findToArray(cli._c, 'entities', {
                        _id : db.mongoID(cli.session.data._id)
                    }, function(err, arr) {
                        callback(arr);
                    }, simpProj);
                }
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

                if (!cli.hasRight('list-all-entities')) {
                    qObj._id = cli.session.data._id;
                }

                db.findToArray(cli._c, 'entities', queryInfo, function (err, arr) {
                    callback(err || arr);
                });
            } else if (levels[0] == 'table') {
                if (!cli.hasRight('list-entities')) {
                    callback({size:0,data:[]});
                    return;
                }

                var powerConstraint = {};
                if (!cli.hasRight('list-all-entities')) {
                    var maxpower = 100000000000;
                    for (var i in cli.session.data.roles) {
                        var role = cli.session.data.roles[i];

                        if (Roles[role] && Roles[role].power < maxpower) {
                            maxpower = Roles[role].power;
                        }
                    }

                    powerConstraint.maxpower = {$gt : maxpower};
                }

                var sort = {};
                sort[typeof params.sortby !== 'undefined' ? params.sortby : '_id'] = (params.order || 1);
                db.aggregate(cli._c, 'entities', [{
                    $unwind : "$roles"
                }, {
                    $lookup : { 
                        from : "roles", 
                        localField : "roles", 
                        foreignField : "name", 
                        as : "deeproles" 
                    }
                }, { 
                    $project : { 
                        user : "$$ROOT", 
                        maxpower : { 
                            $max : "$deeproles.power" 
                        }
                    }
                }, {
                    $match: powerConstraint
                }, {
                    $match: (params.search ? {
                        $text: {
                            $search: params.search
                        }
                    } : {})
                }, {
                    $sort: sort
                }, {
                    $skip: (params.skip || 0)
                }, {
                    $limit: (params.max || 20)
                }], function (data) {
                    results = {
                        size: data.length,
                        data: data.map( (usr) => {
                            return Object.assign(usr.user, usr.maxpower);
                        })
                    };
                    callback(results);
                });
            } else if (levels[0] == 'single' && levels[1]) {
                if (!cli.hasRight('list-entities') && levels[1] !== cli.session.data._id) {
                    callback([]);
                } else {
                    db.findToArray(cli._c, 'entities', {_id: db.mongoID(levels[1])}, function(err, res) {
                        callback(err || res)
                    });
                }
            } else {
                if (!cli.hasRight('list-all-entities') && levels[0] !== cli.session.data.username) {
                    callback([]);
                } else {
                    db.multiLevelFind(cli._c, 'entities', levels, {
                        username: levels[0]
                    }, {
                        limit: [1]
                    }, callback);
                }
            }
        });

        livevars.registerLiveVariable('me', function (cli, levels, params, callback) {
            db.findToArray(cli._c, 'entities', {
                _id: db.mongoID(cli.session.data._id)
            }, function (err, arr) {
                callback(err || arr);
            });
        }, []);

        livevars.registerLiveVariable('session', function (cli, levels, params, callback) {
            var dat = cli.session.data;
            var rights = [];
            for (var k in dat.roles) {
                rights.push(...(Roles[k] || []));
            }

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
                    rights : rights,
                    power: dat.power,
                    username: dat.username,
                    site : dat.site,
                    preferences : dat.preferences || preferences.getDefault(cli._c),
                    notifications: dat.notifications || [],
                    newNotifications: dat.newNotifications || 0
                }
            }

            callback(dat);
        }, []);
    };

    var deletePluginRole = function (identifier) {
        for (var i in Roles) {
            if (Roles[i].pluginID == identifier) {
                db.remove(_c.default(), 'roles', {name : Roles[i].name}, function(err, res) {
                    Roles[i] = undefined;
                    delete Roles[i];
                })
            }
        }
    };

    var registerHooks = function () {
        hooks.bind('plugindisabled', 2, function(identifier) {
            // Check if plugin changed some forms
            deletePluginRole(identifier);
        });
    };

    this.init = function () {
        registerTables();
        registerHooks();

        return this;
    };
};
