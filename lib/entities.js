var _c = configs = require('./config');

const db = require('./db.js');
const filelogic = require('../pipeline/filelogic');
const CryptoJS = require('crypto-js');
const livevars = require('../pipeline/livevars');
const imageResizer = require('./imageResizer.js');
const hooks = require('./hooks');

const PERSONALITIES_ASSOC = {
    none : {displayname : "Unknown"     ,description : "Did not take the personality test" },
    istj : {displayname : "Logistician" ,description : "Practical and fact-minded individuals, whose reliability cannot be doubted." },
    isfj : {displayname : "Defender"    ,description : "Very dedicated and warm protectors, always ready to defend their loved ones." },
    infj : {displayname : "Advocate"    ,description : "Quiet and mystical, yet very inspiring and tireless idealists." },
    intj : {displayname : "Architect"   ,description : "Imaginative and strategic thinkers, with a plan for everything." },
    istp : {displayname : "Virtuoso"    ,description : "Bold and practical experimenters, masters of all kinds of tools." },
    isfp : {displayname : "Adventurer"  ,description : "Flexible and charming artists, always ready to explore and experience something new." },
    infp : {displayname : "Mediator"    ,description : "Poetic, kind and altruistic people, always eager to help a good cause." },
    intp : {displayname : "Logician"    ,description : "Innovative inventors with an unquenchable thirst for knowledge." },
    estp : {displayname : "Entrepreneur",description : "Smart, energetic and very perceptive people, who truly enjoy living on the edge." },
    esfp : {displayname : "Campaigner"  ,description : "Enthusiastic, creative and sociable free spirits, who can always find a reason to smile." },
    enfp : {displayname : "Entertainer" ,description : "Spontaneous, energetic and enthusiastic people – life is never boring around them." },
    entp : {displayname : "Debater"     ,description : "Smart and curious thinkers who cannot resist an intellectual challenge." },
    estj : {displayname : "Executive"   ,description : "Excellent administrators, unsurpassed at managing things – or people." },
    esfj : {displayname : "Consul"      ,description : "Extraordinarily caring, social and popular people, always eager to help." },
    enfj : {displayname : "Protagonist" ,description : "Charismatic and inspiring leaders, able to mesmerize their listeners." },
    entj : {displayname : "Commander"   ,description : "Bold, imaginative and strong-willed leaders, always finding a way – or making one." }
};

const PERSONALITIES_DATASOURCE = [];
for (var type in PERSONALITIES_ASSOC) {
    PERSONALITIES_DATASOURCE.push({
        displayName : PERSONALITIES_ASSOC[type].displayname,
        name : type
    });
    PERSONALITIES_ASSOC[type].code = type;
}

const SOCIAL_NETWORKS = {
    facebook :   { icon : "fa fa-facebook",  color : "#3b5998", border : "#1b3979", url : "https://www.facebook.com/" },
    twitter :    { icon : "fa fa-twitter",   color : "#00b6f1", border : "#0096d1", url : "https://twitter.com/" },
    instagram :  { icon : "fa fa-instagram", color : "#7232bd", border : "#52129d", url : "https://www.instagram.com/" },
    googleplus : { icon : "fa fa-google",    color : "#df4a32", border : "#bf2a12", url : "https://plus.google.com/u/1/+" }
};

class Entity {
    constructor() {
        this._id;
        this.username = "";
        this.shhh = "";
        this.email = "";
        this.roles = [];
        this.jobtitle = "";
        this.displayname = "";
        this.avatarID = -1;
        this.avatarURL = "";
        this.avatarMini = "";
        this.createdOn;
        this.preferences = {};
        this.slug = "";
        this.socialnetworks = {};
        this.personality = "none";

        this.data = {};
    }
}

const toEntitySlug = (str) => {
    return require('slugify')(str).toLowerCase().replace(/\'/g, "");
};

const entityWithData = (oData, callback) => {
    var entity = new Entity();

    for (var key in oData) {
        entity[key] = oData[key];
    }

    callback(entity);
};

class EntityLib {
    getPersonalities () {
        return PERSONALITIES_ASSOC;
    };

    getSocialNetworks () {
        return SOCIAL_NETWORKS;
    };

    firstLogin (cli, userObj, cb) {
        db.update(_c.default(), 'entities', {_id : db.mongoID(userObj._id)}, {totalLogin : 1}, cb);
    };

    registerLogin (cli, userObj, cb) {
        db.update(_c.default(), 'entities', {_id : db.mongoID(userObj._id)}, {totalLogin : ++userObj.totalLogin, lastLogin : new Date()}, cb);
    };

    fetchFromDB  (conf, idOrUsername, callback, force) {
        var condition = new Object();

        if (typeof idOrUsername === "object") {
            condition["_id"] = db.mongoID(idOrUsername);
        } else {
            condition.username = idOrUsername;
        }

        if (condition.username !== 'lilium' && !force){
            condition.sites = conf.id;           
        }    

        db.findToArray(_c.default(), 'entities', condition, (err, user) => {
            if (!err && user.length == 1) {
                entityWithData(user[0], entity => {
                    db.findToArray(_c.default(), 'roles', { name : {$in : entity.roles} }, (err, roles) => {
                        var rights = [];
                        if (entity.roles.indexOf('lilium') != -1 || entity.roles.indexOf('admin') != -1) {
                            rights.push("*")
                        }

                        for (var i = 0; i < roles.length; i++) {
                            rights.push(...roles[i].rights);
                        }

                        entity.rights = rights;
                        callback(entity);
                    });
                });
            } else {
                callback(undefined);
            }
        });
    };

    welcome (cli) {
        const dat = {
            welcomed : true,
            magiclink : Math.random() + "/" + Math.random() + "/*/" + Math.random(),
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

        db.update(_c.default(), "entities", {_id : db.mongoID(cli.userinfo.userid)}, dat, () => {
            cli.postdata.data.usr = cli.userinfo.user;
            cli.postdata.data.psw = cli.postdata.data.password;

            cli.did("auth", "welcome");
            require('./backend/login.js').authUser(cli);
        });
    };

    editInformation(_id, payload, done) {
        payload.reportsto && (payload.reportsto = db.mongoID(payload.reportsto));

        db.update(_c.default(), 'entities', {_id}, payload, () => done());
    }

    toPresentable (entity) {
        return {
            displayname : entity.displayname,
            slug : entity.slug,
            id : entity._id,
            socialnetworks : entity.socialnetworks,
            bio : entity.description,
            title : entity.jobtitle,
            avatarMini: entity.avatarMini,
            avatarURL : entity.avatarURL
        };
    };

    commitfbauth (cli) {
        db.update(_c.default(), 'entities', {_id : db.mongoID(cli.userinfo.userid)}, {fbid : cli.postdata.data.fbid}, () => {
            cli.sendJSON({done : true});
        });
    };

    restore(_id, email, done) {
        db.update(_c.default(), 'entities', { _id }, { email, revoked : false }, () => {
            done();
        });
    };

    revoke(_id, done) {
        db.update(_c.default(), 'entities', {_id}, {revoked : true}, () => {
            done && done();
        });
    }

    maybeRevoke (cli, userid) {
        if (cli.hasRight('revoke-access')) {
            db.update(_c.default(), 'entities', {_id : db.mongoID(userid)}, {revoked : true}, () => {
                cli.sendJSON({revoked : true});
            });
        } else {
            cli.sendJSON({revoked : false, reason : "role"});
        }
    };

    updateProfile  (cli) {
        cli.touch('entities.updateProfile');
        var entData = cli.postdata.data;
        var entity = this.initialiseBaseEntity(entData);

        entity._id = cli.userinfo.userid;
        delete entity.roles;
        delete entity.sites;

        var split = entity.displayname.split(' ');
        entity.firstname = split.shift();
        entity.lastname = split.join(' ');

        if (entData.phone) {
            entity.phone = entData.phone.trim().replace(/[()\-\sa-zA-Z]/g, '');
        }

        this.updateEntity(entity, cli._c.id, (err, res) => {
            cli.did("entity", "update");
            if (!err){
                log('Entities', 'Updated entity with id ' + cli.userinfo.userid);
                require('./lib/session.js').reloadSession(cli, () => {
                    cli.sendJSON({
                        success : true
                    });
                });

                hooks.fire('profileUpdated', { entity });
            } else {
                log('[Database] error while updating entity : ' + err);
                cli.throwHTTP(500);
            }
        });

    };

    updateProfilePictureID (cli, selff) {
        var imgid = cli.postdata.data.imageid;
        var imgurl = cli.postdata.data.imageurl;
        var miniurl = cli.postdata.data.miniurl;

        if (imgid && imgurl) {
            db.update(_c.default(), "entities", {_id : db.mongoID(cli.userinfo.userid)}, {avatarURL : imgurl, avatarMini : miniurl || imgurl, avatarID : db.mongoID(imgid)}, (err, res) => {
                require('./lib/session.js').reloadSession(cli, () => {
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

    commitProfilePic (cli, filename, cb) {
        var sessionManager = require('./lib/session.js');
        var ext = filename.substring(filename.lastIndexOf('.') + 1);

        require('./lib/media').getDirectoryForNew(cli._c, updir => {
            imageResizer.resize(updir + filename, filename, ext, cli._c, images => {
                var userid = cli.userinfo.userid;
                var avatarURL = images.square.url;
                var avatarMini = images.mini.url;
                var avatarID = filename.substring(0, filename.lastIndexOf('.'));

                cli.did("entity", "picupload");
                db.update(_c.default(), 'entities', {
                    _id: db.mongoID(userid)
                }, {
                    avatarURL: avatarURL,
                    avatarMini : avatarMini,
                    avatarID: db.mongoID(avatarID)
                }, (err, result) => {
                    images.success = true;
                    hooks.fire('profilePicUpdated', { _id : db.mongoID(userid), images });
                    cb(err, images);
                });
            });
        });
    };

    uploadFirstAvatar (cli) {
        var filename = cli.postdata.data[0];
        this.commitProfilePic(cli, filename, (err, images) => {
            cli.did("entity", "picupload");
            cli.sendJSON(err || images);
        });
    };

    hashPassword(password) {
        return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
    }

    update  (cli) {
        var that = this;
        if (cli.hasRight('edit-entities')) {
            var entData = cli.postdata.data;
            var entity = this.initialiseBaseEntity(entData);
            entity._id = db.mongoID(cli.routeinfo.path[3]);

            db.findUnique(_c.default(), 'entities', { _id : entity._id }, (err, original) => {
                var split = entity.displayname.split(' ');
                entity.firstname = split.shift();
                entity.lastname = split.join(' ');

                log("Entities", "User " + cli.userinfo.displayname + " validates its right to update user with id " + entity._id, "info");
                if (original.roles.indexOf("lilium") != -1) {  
                    entity.roles.push("lilium");
                }

                entity.sites = Array.from(new Set(entity.sites));
                
                that.updateEntity(entity, cli._c.id, (err, res) => {
                    if (!err){
                        log("Entities", "User " + cli.userinfo.displayname + " updated user " + entity.displayname + " (" + entity._id + ")", "success");
                        cli.sendJSON({error : err, updated : !err});
                    } else {
                        log('[Database] error while updating entity : ' + err);
                        cli.throwHTTP(500, err, true);
                    }
                });
            });
        } else {
            cli.throwHTTP(401, "I'm so sorry... I simply can't let you edit this user. Contact your admin!", true);
        }
    }

    serveEdit  (cli) {
        cli.touch('entities.serveEdit');
        filelogic.serveAdminLML(cli, true);
    };

    serveNew  (cli) {
        cli.touch('entities.serveNew');
        filelogic.serveAdminLML(cli);
    };

    refreshSlugs (cli, cb) {
        db.findToArray(_c.default(), 'entities', {}, (err, arr) => {
            var i = 0;
            var nextEnt = () => {
                db.update(_c.default(), 'entities', {_id : db.mongoID(arr[i]._id)}, {
                    slug : toEntitySlug(arr[i].displayname || arr[i].username || "")
                }, () => {
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

    getDefaultPrefs (_c) {
        return {
            "topbuttontext" : "Publish",
            "topbuttonlink" : _c.server.url + "/admin/article/new"
        };
    };

    initialiseBaseEntity  (entData) {
        var newEnt = this.createEmptyEntity();

        newEnt.username = entData.username;
        newEnt.shhh = CryptoJS.SHA256(entData.password).toString(CryptoJS.enc.Hex);
        newEnt.email = entData.email;
        newEnt.description = entData.description || '';

        if (entData.reportsto) {
            newEnt.reportsto = db.mongoID(entData.reportsto);
        }

        newEnt.roles = [];
        for (var index in entData.roles) {
            if (entData.roles[index] !== "") {
                newEnt.roles.push(entData.roles[index]);
            }
        }

        newEnt.sites = entData.sites || [require('./lib/config').default().id];
        newEnt.jobtitle = entData.jobtitle;
        newEnt.displayname = entData.displayname;
        newEnt.firstname = entData.firstname;
        newEnt.lastname = entData.lastname;
        newEnt.personality = entData.personality;
        newEnt.phone = entData.phone;
        newEnt.socialnetworks = {
            facebook   : entData["socialnetworks.facebook"]   || "",
            twitter    : entData["socialnetworks.twitter"]    || "",
            googleplus : entData["socialnetworks.googleplus"] || "",
            instagram  : entData["socialnetworks.instagram"]  || ""
        };
        newEnt.createdOn = new Date();
        newEnt.slug = entData.slug || toEntitySlug(entData.displayname || entData.username || "");

        if (typeof newEnt.meta === "object") {
            for (var key in newEnt.meta) {
                newEnt.data[key] = newEnt.meta[key];
            }
        }
        return newEnt;
    }

    invite(_c, data, done) {
        if (!data.username || !data.roles || !data.sites || !data.displayname || !data.email) {
            return done(false, 'fields');
        }

        db.findUnique(require('./config').default(), 'entities', { username : data.username }, (err, maybeExist) => {
            if (maybeExist) {
                return done(false, 'username');
            }

            const entity = this.initialiseBaseEntity(data);

            // Create Magic Link
            var magiclink = "lml_" + 
                Math.random().toString().substring(3) + "_ml_" + 
                Math.random().toString().substring(3) + "_" + new Date().getTime();

            entity.username = entity.username.trim();
            entity.displayname = entity.displayname.trim();
            entity.email = entity.email.trim();
            
            entity.magiclink = magiclink;
            entity.firstname = entity.firstname || entity.displayname.split(' ')[0];

            db.insert(require('./config').default(), 'entities', entity, () => {
                require('./mail.js').triggerHook(_c, 'to_new_user', entity.email, {
                    entity : entity
                });

                hooks.fire("entityInvited", { entity });
                done(true);
            });
        });
    }

    createFromCli  (cli) {
        cli.touch('entities.createFromCli');
        var entData = cli.postdata.data;
        var newEnt = this.initialiseBaseEntity(entData);

        this.registerEntity(cli, newEnt, () => {
            hooks.fire('entity_created', {
                cli: cli
            });

            cli.touch('entities.registerEntity.callback');
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath);
        });
    };

    deleteFromCli  (cli) {
        var id = cli.postdata.data.uid;

        db.update(_c.default(), 'entities', {
            _id: db.mongoID(id)
        }, {status : 'deleted'}, (err, result) => {

            hooks.fire('entity_deleted', {
                id: id
            });

            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath);
        });
    };

    createEmptyEntity  () {
        return new Entity();
    };

    validateEntityObject  (e, cli, cb) {
        var valid = true;
        valid = e.username != "" && e.shhh != "" && e.email != "" && e.displayname != "" && e.roles;
        cb(valid);
    };

    registerEntity  (cli, entity, callback) {
        this.validateEntityObject(entity, cli, valid => {
            if (valid) {
                cli.did("entity", "createduser", {username : entity.username});
               
                if (!cli.hasRight('admin')) {
                    entity.roles = entity.roles.filter(x => x != "admin" && x != "lilium");
                }

                // Create Magic Link
                var magiclink = "lml_" + 
                    Math.random().toString().substring(3) + "_ml_" + 
                    Math.random().toString().substring(3) + "_" + new Date().getTime();

                entity.magiclink = magiclink;
                
                entity.username = entity.username.trim();
                entity.displayname = entity.displayname.trim();
                entity.email = entity.email.trim();

                db.insert(_c.default(), 'entities', entity, callback, true);

                if (entity.email && entity.displayname) {
                    entity.firstname = entity.firstname || entity.displayname.split(' ')[0];
                    require('./mail.js').triggerHook(cli._c, 'to_new_user', entity.email, {
                        entity : entity
                    });
                }
            } else {
                callback("[EntityValidationException] Entity object misses required fields.", undefined);
            }
        });
    };

    sendMagicLinkToEveryone (cli, done) {
        db.findToArray(_c.default(), 'entities', {revoked : {$ne : true}}, (arr, users) => {
            users.forEach(user => {
                this.sendNewMagicEmail(cli, user._id);
            });

            done();
        });
    };

    sendNewMagicEmail  (cli, entityid, callback) {
        db.findUnique(_c.default(), 'entities', {_id : db.mongoID(entityid)}, (err, entity) => {
            if (entity) {
                log('Entity', "Sending magic link to " + entity.email);

                var magiclink = "lml_" + 
                    Math.random().toString().substring(3) + "_ml_" + 
                    Math.random().toString().substring(3) + "_" + new Date().getTime();

                db.update(_c.default(), 'entities', {_id : entity._id}, {magiclink : magiclink}, () => {
                    callback && callback(true);   
                });

                entity.firstname = entity.firstname || entity.displayname.split(' ')[0];
                entity.magiclink = magiclink;
                require('./mail.js').triggerHook(cli._c, 'to_new_user', entity.email, {
                    entity : entity
                });
            } else {
                log('Entity', "Could not find entity with id : " + entityid)
                callback && callback(false);
            }
        });
    };

    updateEntity  (valObject, siteid, cb) {
        var id = typeof valObject._id !== "object" ? db.mongoID(valObject._id) : valObject._id;
        // Removing properties we don't want to edit
        delete valObject.username;
        delete valObject.shhh;
        delete valObject._id;
        delete valObject.createdOn;
        delete valObject.avatarID;
        delete valObject.avatarURL;
        delete valObject.avatarMini;

        db.update(_c.default(), 'entities', {_id : id}, valObject, cb);
    };

    registerRole  (rObj, rights, callback, updateIfExists, allsites) {
        rObj.rights = rights;

        if (allsites) {
            var sites = _c.getAllSites();
            for (var i in sites) {
                db.update(_c.default(), 'roles', {
                    name: rObj.name
                }, rObj, (err, result) => {
                    callback(rObj);
                }, updateIfExists);
            }
        } else {
            db.update(_c.default(), 'roles', {
                name: rObj.name
            }, rObj, (err, result) => {
                callback(rObj);
            }, updateIfExists);
        }
    };

    isAllowed  (entity, right) {
        var allowed = true;
        var that = this;

        if (entity && entity.loggedin && right != "" && right.length !== 0 && entity.rights[0] != "*") {
            if (typeof right === "string") {
                right = [right];
            }

            for (var i = 0; i < right.length; i++) {
                if (entity.rights.indexOf(right[i]) == -1) {
                    allowed = false;
                    break;
                }
            }
        } 

        return allowed;
    };

    rightsFromRoles(roles = [], send) {
        db.findToArray(_c.default(), 'roles', { name : { $in : roles } }, (err, arr) => {
            send([].concat(...arr.map(r => r.rights)));
        });
    };

    handleMePOST(cli) {
        cli.sendJSON({ [cli.postdata.data.field] : cli.postdata.data.value });
    };


}

module.exports = new EntityLib();
