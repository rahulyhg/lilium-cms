var _c = configs = require('./config.js');
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
var feed = require('./feed.js');

var Roles = new Object();

var Entity = function () {
    this._id = undefined;
    this.username = "";
    this.shhh = "";
    this.email = "";
    this.roles = new Array();
    this.jobtitle = "";
    this.displayname = "";
    this.avatarID = -1;
    this.avatarURL = "";
    this.createdOn = undefined;
    this.preferences = new Object();
    this.slug = "";
    this.badges = {}; // title : level
    this.socialnetworks = {};

    // Various data; should always be checked for undefined
    this.data = new Object();
};

var toEntitySlug = function(str) {
    return require('slugify')(str).toLowerCase().replace(/\'/g, "");
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

    this.firstLogin = function(cli, userObj, cb) {
        db.update(_c.default(), 'entities', {_id : db.mongoID(userObj._id)}, {totalLogin : 1}, cb);
    };

    this.registerLogin = function(cli, userObj, cb) {
        db.update(_c.default(), 'entities', {_id : db.mongoID(userObj._id)}, {totalLogin : userObj.totalLogin++}, cb);
    };

    this.fetchFromDB = function (conf, idOrUsername, callback) {
        var condition = new Object();

        if (typeof idOrUsername === "object") {
            condition["_id"] = db.mongoID(idOrUsername);
        } else {
            condition.username = idOrUsername;
        }

        if (condition.username !== 'lilium'){
            condition.sites = conf.id;           
        }    

        db.findToArray(_c.default(), 'entities', condition, function(err, user) {
            if (!err && user.length == 1) {
                entityWithData(user[0], callback);
            } else {
                callback(undefined);
            }
        });
    };

    this.welcome = function(cli) {
        var dat = {
            welcomed : true,
            firstname : cli.postdata.data.firstname,
            lastname : cli.postdata.data.lastname,
            jobtitle : cli.postdata.data.jobtitle,
            description : cli.postdata.data.shortbio, 
            phone : cli.postdata.data.phone,
            socialnetworks : cli.postdata.data.socialnetworks
        };

        dat.socialnetworks = {
            facebook : dat.socialnetworks[0],
            twitter : dat.socialnetworks[1],
            googleplus : dat.socialnetworks[2],
            instagram : dat.socialnetworks[3]
        };

        dat.displayname = dat.firstname + " " + dat.lastname;

        if (cli.postdata.data.password) {
            dat.shhh = CryptoJS.SHA256(cli.postdata.data.password).toString(CryptoJS.enc.Hex);
        }

        db.update(_c.default(), "entities", {_id : db.mongoID(cli.userinfo.userid)}, dat, function() {
            cli.postdata.data.usr = cli.userinfo.user;
            cli.postdata.data.psw = cli.postdata.data.password;

            db.findToArray(_c.default(), "entities", {_id : db.mongoID(cli.userinfo.userid)}, function(err, arr) {
                feed.push(cli.userinfo.userid, cli.userinfo.userid, 'welcomed', cli._c.id, {
                    displayname : dat.displayname,
                    avatarURL : arr[0].avatarURL,
                    job : dat.jobtitle
                });
            }, {avatarURL : 1});

            cli.did("auth", "welcome");
            require('./backend/login.js').authUser(cli);
        });
    };

    this.handleGET = function (cli) {
        cli.touch('entities.handleGET');
        if (!cli.hasRightOrRefuse("list-entities")) {return;}

        if (cli.routeinfo.path.length == 2) {
            filelogic.serveAdminLML(cli);
        } else {
            var action = cli.routeinfo.path[2];

            switch (action) {
            case "edit":
                this.serveEdit(cli);
                break;

            case "new":
                if (!cli.hasRightOrRefuse("create-entities")) {return;}
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
            case "update_profile":
                this.updateProfile(cli);
                break;
            case "upload_profile_picture":
                this.updateProfilePictureID(cli, true);
                break;
            case "update_password":
                this.changePassword(cli, true);
                break;
            case "commitfbauth":
                this.commitfbauth(cli);
                break;
            default:
                cli.throwHTTP(401);
                break;
            }
        } else if (cli.routeinfo.path[2] == 'edit') {
            if (cli.hasRight('edit-entities')) {

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
                cli.refuse();
            }
        } else if (cli.routeinfo.path[2] == "revoke") {
            // Double check this portion of code
            // Async call
            if (cli.hasRightOrRefuse('create-entities')) {
                this.maybeRevoke(cli, cli.postdata.data.userid);
            }
        } else {
            if (cli.hasRight('edit-entities')) {
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
                cli.refuse();
            }
        }
    };

    this.commitfbauth = function(cli) {
        db.update(cli._c, 'entities', {_id : db.mongoID(cli.userinfo.userid)}, {fbid : cli.postdata.data.fbid}, function() {
            cli.sendJSON({done : true});
        });
    };

    this.canActOn = function(actor, subject, cb) {
        var that = this;
        that.maxPower(undefined, function(actorpower) {
            that.maxPower(undefined, function(subpower) {
                cb(actorpower < subpower);
            }, subject);
        }, actor);
    }

    this.maybeRevoke = function(cli, userid) {
        var that = this;
        userid = userid || cli.postdata.data.userid;

        this.maxPower(cli, function(userpower) {
            that.maxPower(cli, function(entitypower) {
                if (userpower < entitypower) {
                    db.update(_c.default(), 'entities', {_id : db.mongoID(userid)}, {revoked : true}, function() {
                        cli.sendJSON({revoked : true});
                    });
                } else {
                    cli.sendJSON({revoked : false, reason : "power", powerlevel : {you : userpower, entity : entitypower}});
                }
            }, db.mongoID(userid));
        });
    };

    this.updateProfile = function (cli) {
        cli.touch('entities.updateProfile');
        var entData = cli.postdata.data;
        var entity = this.initialiseBaseEntity(entData);

        entity._id = cli.userinfo.userid;
        delete entity.roles;
        delete entity.sites;
        delete entity.badges;

        this.updateEntity(entity, cli._c.id, function(err, res) {
            cli.did("entity", "update");
            if (!err){
                log('Entities', 'Updated entity with id ' + cli.userinfo.userid);
                require('./session.js').reloadSession(cli, function() {
                    cli.sendJSON({
                        success : true
                    });
                });
            } else {
                log('[Database] error while updating entity : ' + err);
                cli.throwHTTP(500);
            }
        });

    };

    this.updateProfilePictureID = function(cli, selff) {
        var imgid = cli.postdata.data.imageid;
        var imgurl = cli.postdata.data.imageurl;

        if (imgid && imgurl) {
            db.update(_c.default(), "entities", {_id : db.mongoID(cli.userinfo.userid)}, {avatarURL : imgurl, avatarID : db.mongoID(imgid)}, function(err, res) {
                require('./session.js').reloadSession(cli, function() {
                    cli.sendJSON({
                        imgid : db.mongoID(imgid),
                        imgurl : imgurl,
                        error : err,
                        success : !err
                    });
                });
            });
        } else {
            cli.sendJSON({
                error : "Wrong parameters",
                params : {
                    imgid : imgid,
                    imgurl : imgurl
                }
            });
        }
    };

    this.commitProfilePic = function(cli, filename, cb) {
        var sessionManager = require('./session.js');
        var ext = filename.substring(filename.lastIndexOf('.') + 1);

        imageResizer.resize(cli._c.server.base + "backend/static/uploads/" + filename, filename, ext, cli._c, function(images) {
            var userid = cli.userinfo.userid;
            var avatarURL = images.square.url;
            var avatarID = filename.substring(0, filename.lastIndexOf('.'));

            cli.did("entity", "picupload");
            db.update(_c.default(), 'entities', {
                _id: db.mongoID(userid)
            }, {
                avatarURL: avatarURL,
                avatarID: db.mongoID(avatarID)
            }, function(err, result) {
                images.success = true;
                cb(err, images);
            });
        });
    };

    this.uploadFirstAvatar = function(cli) {
        var filename = cli.postdata.data[0];
        this.commitProfilePic(cli, filename, function(err, images) {
            cli.did("entity", "picupload");
            cli.sendJSON(err || images);
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

                imageResizer.resize(saveTo, image.picture, mime, cli._c, function (images) {
                    var avatarURL = images.square.url;
                    var avatarID = image.picture.substring(0, image.picture.lastIndexOf('.'));
                    var id = isProfile ? cli.userinfo.userid : cli.routeinfo.path[3];
                    var sessionManager = require('./session.js');

                    // Save it in database
                    db.update(_c.default(), 'entities', {
                        _id: db.mongoID(id)
                    }, {
                        avatarURL: avatarURL,
                        avatarID: db.mongoID(avatarID)
                    }, function (err, result) {
                        cli.did("entity", "picupload");

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

            cli.did("entity", "passwordchanged", {user : id});
            db.update(_c.default(), 'entities', {
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

    this.maxPower = function (cli, callback, userid) {
        db.aggregate(_c.default(), 'entities', [{
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
                '_id': userid || db.mongoID(cli.userinfo._id ? cli.userinfo._id : cli.userinfo.userid)
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
        var that = this;
        if (cli.hasRight('edit-entities')) {
            var entData = cli.postdata.data;
            var entity = this.initialiseBaseEntity(entData);
            entity._id = cli.routeinfo.path[3];

            log("Entities", "User " + cli.userinfo.displayname + " validates its right to update user with id " + entity._id, "info");
            that.canActOn(db.mongoID(cli.userinfo.userid), db.mongoID(entity._id), function(allowed) {
                if (!allowed) {
                    return cli.throwHTTP(401, "I'm so sorry... I simply can't let you edit this user. Contact your admin!", true);
                }

                db.findToArray(_c.default(), 'entities', {_id : db.mongoID(entity._id)}, function(err, arr) {
                    db.findToArray(_c.default(), 'entities', {_id : db.mongoID(cli.userinfo.userid)}, function(err, uarr) {
                        if (arr[0].roles.indexOf("lilium") != -1) {  
                            entity.roles.push("lilium");
                        }
        
                        if (arr[0].sites) {
                            var loggeduser = uarr[0];
        
                            var currentsites = arr[0].sites;
                            var newsites = entity.sites;
        
                            for (var i = 0; i < currentsites.length; i++) if (loggeduser.sites.indexOf(currentsites[i]) == -1) {
                                newsites.push(currentsites[i]);
                            }
    
                            entity.sites = newsites;
                        }    
                    
                        that.updateEntity(entity, cli._c.id, function(err, res) {
                            if (!err){
                                log("Entities", "User " + cli.userinfo.displayname + " updated user " + entity.displayname + " (" + arr[0]._id + ")", "success");
                                cli.sendJSON({error : err, updated : !err});
                            } else {
                                log('[Database] error while updating entity : ' + err);
                                cli.throwHTTP(500, err, true);
                            }
                        });
                    });
                });
            });
        } else {
            cli.throwHTTP(401, "I'm so sorry... I simply can't let you edit this user. Contact your admin!", true);
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

    this.refreshSlugs = function(cli, cb) {
        db.findToArray(_c.default(), 'entities', {}, function(err, arr) {
            var i = 0;
            var nextEnt = function() {
                db.update(_c.default(), 'entities', {_id : db.mongoID(arr[i]._id)}, {
                    slug : toEntitySlug(arr[i].displayname || arr[i].username || "")
                }, function() {
                    i++;

                    if (arr.length == i) {
                        cb(arr.length);
                    } else {
                        setTimeout(nextEnt, 0);
                    }
                });
            };
            nextEnt();
        });
    };

    this.getDefaultPrefs = function(_c) {
        return {
            "topbuttontext" : "Publish",
            "topbuttonlink" : _c.server.url + "/admin/article/new"
        };
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
        newEnt.sites = entData.sites || [require('./config.js').default().id];
        newEnt.jobtitle = entData.jobtitle;
        newEnt.displayname = entData.displayname;
        newEnt.firstname = entData.firstname;
        newEnt.lastname = entData.lastname;
        newEnt.phone = entData.phone;
        newEnt.socialnetworks = {facebook:entData["socialnetworks.facebook"]||"",twitter:entData["socialnetworks.twitter"]||"",googleplus:entData["socialnetworks.googleplus"]||"",instagram:entData["socialnetworks.instagram"]||""};
        newEnt.createdOn = new Date();
        newEnt.slug = entData.slug || toEntitySlug(entData.displayname || entData.username || "");

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

        db.update(_c.default(), 'entities', {
            _id: db.mongoID(id)
        }, {status : 'deleted'}, function (err, result) {

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
    console.log(e);
        var valid = true;
        valid = e.username != "" && e.shhh != "" && e.email != "" && e.displayname != "" && e.roles;
        cli.hasEnoughPower(e.roles, function (hasEnoughPower) {
            valid = hasEnoughPower;
            cb(valid);
        });
    };

    this.registerEntity = function (cli, entity, callback) {
        this.validateEntityObject(entity, cli, function (valid) {
            if (valid) {
                cli.did("entity", "createduser", {username : entity.username});
                db.insert(_c.default(), 'entities', entity, callback, true);
            } else {
                callback("[EntityValidationException] Entity object misses required fields.", undefined);
            }
        });
    };

    this.updateEntity = function (valObject, siteid, cb) {
        var id = typeof valObject._id !== "object" ? db.mongoID(valObject._id) : valObject._id;
        // Removing properties we don't want to edit
        delete valObject.username;
        delete valObject.shhh;
        delete valObject._id;
        delete valObject.createdOn;
        delete valObject.avatarID;
        delete valObject.avatarURL;
        delete valObject.badges;

        db.update(_c.default(), 'entities', {_id : id}, valObject, cb);
    };

    this.cacheRoles = function (callback) {
        log('Roles', 'Caching roles from Database');
        var sites = _c.getAllSites();
        for (var i in sites) {
            db.findToArray(_c.default(), 'roles', {$or : [{'pluginID': false}, {'pluginID': null}]}, function (err, roles) {
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

    this.registerRole = function (rObj, rights, callback, updateIfExists, allsites) {
        if (typeof Roles[rObj.name] !== 'undefined') {
            log('Roles', new Error("[RolesException] Tried to register already registered role " + rObj.name));
        } else {
            rObj.pluginID = pluginHelper.getPluginIdentifierFromFilename(__caller, undefined, true);
            rObj.rights = rights;
            if (allsites) {
                var sites = _c.getAllSites();
                for (var i in sites) {
                    db.update(_c.default(), 'roles', {
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
            .addTemplate('entity_create')
            .addTemplate('entity_rights')
            .add('Create', 'submit');

        formbuilder.createForm('update_entitiy', {
                fieldWrapper : "lmlform-fieldwrapper",
                async : true
            })
            .addTemplate('entity_create')
            .addTemplate('entity_rights')
            .remove('password')
            .edit('username', '', {
                disabled : true
            })
            .edit('create', '', {
                value: 'Update Profile'
            })
            .add('Save', 'submit');

        formbuilder.createForm('disable_entity', {
            fieldWrapper : "lmlform-fieldwrapper"
        })
            .add('disent-title', 'title', {
                displayname : "Disable Entity"
            })
            .add('disable-entity', 'button', {
                type : "button",
                displayname : "Revoke access to Lilium",
                classes : ["red"],
                callback : "confirmLockUser"
            })

        formbuilder.createForm('update_profile', {
            fieldWrapper : "lmlform-fieldwrapper",
            async : true
        })
            .addTemplate('entity_create')
            .addTemplate('entity_social')
            .remove('password')
            .edit('username', '', {
                disabled : true
            })
            .edit('create', '', {
                value: 'Update Profile'
            })
            .add('Save', 'submit');


        formbuilder.createForm('update_password', {
                fieldWrapper : "lmlform-fieldwrapper",
                async : true
            })
            .add('editpasswd', 'title', {
                displayname: 'Edit Password'
            })
            .add('password', 'password')
            .add('authbtnset', 'buttonset', {
                buttons: [{
                    displayname : 'Edit Password',
                    name : 'update'
                }, {
                    name : 'allowfbauth',
                    displayname : 'Allow Facebook Authentication',
                    type : 'button',
                    callback : "liliumcms.facebook.allowfbauth();"
                }]
            });

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
                db.findToArray(_c.default(), 'entities', cli.hasRight('list-entities') ? {} : {
                    _id : db.mongoID(cli.session.data._id)
                }, function(err, arr) { 
                    callback(arr); 
                });
            } else if (levels[0] == "chat") {
                db.find(_c.default(), 'entities', {revoked : {$ne : true}}, [], function(err, cur) {
                    cur.sort({fullname : 1}).toArray(function(err, arr) {
                        callback(err || arr);
                    });
                }, {
                    displayname : 1, 
                    avatarURL : 1
                });
            } else if (levels[0] == "cached") {
                db.findToArray(_c.default(), 'entities', {}, function(e, a) {callback(a);}, {displayname : 1, avatarURL : 1});
            } else if (levels[0] == "simple") {
                var simpProj = {
                    displayname : 1,
                    _id : 1
                };
            
                db.findToArray(_c.default(), 'entities', {}, function(err, arr) {
                    callback(arr);
                }, simpProj);
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

                if (!cli.hasRight('list-entities')) {
                    qObj._id = cli.session.data._id;
                }

                db.findToArray(_c.default(), 'entities', queryInfo, function (err, arr) {
                    callback(err || arr);
                });
            } else if (levels[0] == 'table') {
                if (!cli.hasRight('list-entities')) {
                    callback({size:0,data:[]});
                    return;
                }

                var sort = {};
                sort[typeof params.sortby !== 'undefined' ? params.sortby : '_id'] = (params.order || 1);

                var mtch = (params.search ? {
                    $text: {
                        $search: params.search
                    }
                } : {});
                mtch.revoked = {$ne : true};

                db.aggregate(_c.default(), 'entities', [{
                    $match: mtch
                }, {
                    $sort: sort
                }, {
                    $skip : params.skip || 0
                }, {
                    $limit : params.max || 20
                }], function (data) {
                    if (cli._c.content && cli._c.content.cdn && cli._c.content.cdn.domain && data && data.length) {
                        for (var i = 0; i < data.length; i++) if (data[i].avatarURL) {
                            data[i].avatarURL = data[i].avatarURL.replace(cli._c.server.url, cli._c.content.cdn.domain);
                        }
                    }

                    db.count(_c.default(), 'entities', mtch, function(err, total) {
                        callback({
                            size : total,
                            data : data
                        });
                    });
                });
            } else if (levels[0] == 'single' && levels[1]) {
                if (!cli.hasRight('list-entities') && levels[1] !== cli.session.data._id) {
                    callback([]);
                } else {
                    db.findToArray(_c.default(), 'entities', {_id: db.mongoID(levels[1])}, function(err, res) {
                        callback(err || res)
                    });
                }
            } else {
                if (!cli.hasRight('list-entities') && levels[0] !== cli.session.data.username) {
                    callback([]);
                } else {
                    db.multiLevelFind(_c.default(), 'entities', levels, {
                        username: levels[0]
                    }, {
                        limit: [1]
                    }, callback);
                }
            }
        }, ["dash"]);

        livevars.registerLiveVariable('me', function (cli, levels, params, callback) {
            db.findToArray(_c.default(), 'entities', {
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
                    badges : dat.badges,
                    preferences : dat.preferences || preferences.getDefault(cli._c),
                    newNotifications: dat.newNotifications || 0,
                    data : (params.withdata ? dat.data : undefined)
                }
            }

            callback(dat);
        }, []);
    };

    // Not working properly
    this.getRights = function(cli, entityid, cb) {
        db.find(cli._c, 'entities', {_id : db.mongoID(entityid)}, [], function(err, cur) {
            cur.hasNext(function(err, hasnext) {
                if (hasnext) {
                    cur.next(function(err, usrr) {
                        var rls = usrr.roles;
                        if (rls.indexOf('lilium') != -1 || rls.indexOf('admin') != -1) {
                            cb(["*"]);
                        } else {
                            var urights = [];
                            for (var i = 0; i < rls.length; i++) {
                                urights.push(...Roles[rls[i]]);
                            }

                            cb(urights);
                        }
                    });
                } else {
                    cb([]);
                }
            });
        }, {roles : 1})
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
