var _c = configs = require('../lib/config');

var db = require('../lib/db.js');
const filelogic = require('../pipeline/filelogic');
var CryptoJS = require('crypto-js');
var livevars = require('../pipeline/livevars');
var imageResizer = require('../lib/imageResizer.js');
var hooks = require('../lib/hooks');

const elib = require('../lib/entities');


const ALLOWED_ME_FIELDS = [ 
    // Basic information
    "displayname", "description", "email", "phone", "personality", 'jobtitle', 'avatarURL', 'currency',

    // Social profiles
    "socialnetworks.facebook", "socialnetworks.twitter", "socialnetworks.instagram", "socialnetworks.googleplus"
];

const ME_PROJECTION = {
    displayname : 1, badges : 1, 
    avatarURL : 1, description : 1,
    personality : 1, socialnetworks : 1,
    firstname : 1, lastname : 1,
    jobtitle : 1, phone : 1, email : 1,
    enforce2fa: 1, confirmed2fa: 1,
    username : 1, currency: 1
};

class Entities {
    adminGET  (cli) {
        cli.touch('entities.handleGET');
        if (!cli.hasRightOrRefuse("list-entities")) {return;}

        if (cli.routeinfo.path.length == 2) {
            filelogic.serveAdminLML3(cli);
        } else {
            var action = cli.routeinfo.path[2];

            switch (action) {
            case "edit":
                elib.serveEdit(cli);
                break;

            case "new":
                if (!cli.hasRightOrRefuse("create-entities")) {return;}
                elib.serveNew(cli);
                break;

            default:
                return cli.throwHTTP(404, 'Not Found');
                break;
            }
        }
    };

    adminPOST(cli) {
        cli.touch('entities.handlePOST');
        
        if (cli.routeinfo.path[1] == 'me') {
            if (cli.routeinfo.path[2] == "updateOneField") {
                if (ALLOWED_ME_FIELDS.includes(cli.postdata.data.field)) {
                    db.update(require('./lib/config').default(), 'entities', { _id : db.mongoID(cli.userinfo.userid) }, {
                        [cli.postdata.data.field] : cli.postdata.data.value
                    }, () => {
                        cli.sendJSON({
                            updated : {
                                [cli.postdata.data.field] : cli.postdata.data.value
                            }
                        })
                    });
                } else {
                    cli.refuse();
                }
            } else if (cli.routeinfo.path[2] == 'updatePassword') {
                if (cli.postdata.data.new != cli.postdata.data.old) {
                    const old = CryptoJS.SHA256(cli.postdata.data.old).toString(CryptoJS.enc.Hex);
                    const newPWD = CryptoJS.SHA256(cli.postdata.data.new).toString(CryptoJS.enc.Hex);
                    const _id = db.mongoID(cli.userinfo.userid);
    
                    db.findUnique(require('./config').default(), 'entities', { _id: _id }, (err, user) => {
                        if (!err && user) {
                            if (old == user.shhh || user.mustupdatepassword) {
                                db.update(require('./config').default(), 'entities', { _id, shhh : {$ne : newPWD}, $or : [{shhh : old}, {mustupdatepassword : true}] }, { shhh: newPWD, mustupdatepassword : false }, (err, r) => {
                                    log('Entities', 'Updated entity ' + _id + ' : ' + !!r.matchedCount, 'info');
                                    cli.sendJSON({
                                        updated : !!r.matchedCount
                                    });
                                });
                            } else {
                                cli.sendJSON({ err: "The provided 'old' password was wrong", updated: false });
                            }
                        } else {
                            cli.sendJSON({ err: 'Error fetching user from database for password reset', updated: false });
                        }
                    });
                } else {
                    cli.sendJSON({ err: "The new password password must be different from the old one", updated: false })
                }
            } else {
                switch (cli.postdata.data.form_name) {
                case "update_profile":
                    elib.updateProfile(cli);
                    break;
                case "upload_profile_picture":
                    elib.updateProfilePictureID(cli, true);
                    break;
                case "commitfbauth":
                    elib.commitfbauth(cli);
                    break;
                default:
                    cli.throwHTTP(401);
                    break;
                }
            }
        } else if (cli.routeinfo.path[2] == "revoke") {
            cli.hasRightOrRefuse('revoke-access') && elib.revoke(db.mongoID(cli.routeinfo.path[3]), () => { cli.sendJSON({ ok : 1 }) });
        } else if (cli.routeinfo.path[2] == 'mustUpdatePassword') {
            if (cli.hasRightOrRefuse('manage-entities')) {
                const _id = db.mongoID(cli.routeinfo.path[3]);
                db.update(_c.default(), 'entities', { _id }, { mustupdatepassword: true }, (err, r) => {
                    cli.sendJSON({ success: true });
                });
            }
        } else if (cli.routeinfo.path[2] == "edit") {
            cli.hasRightOrRefuse('edit-entities') && elib.editInformation(db.mongoID(cli.routeinfo.path[3]), cli.postdata.data, () => { cli.sendJSON({ ok : 1 }) });
        } else if (cli.routeinfo.path[2] == "invite") {
            cli.hasRightOrRefuse('create-entities') && elib.invite(cli._c, cli.postdata.data, (ok, reason) => { cli.sendJSON({ ok, reason }) });
        } else if (cli.routeinfo.path[2] == "changeUsername") {
            db.exists(_c.default(), 'entities', { username: cli.postdata.data.username }, (err, exists) => {
                if (!err) {
                    cli.sendJSON({ success: !exists });
                } else {
                    cli.throwHTTP(500, '', true);
                    log('Entities', 'DB error while checking for user existance');
                }
            })
        } else if (cli.routeinfo.path[2] == "impersonate") {
            require('./backend/login.js').impersonate(cli);
        } else if (cli.routeinfo.path[2] == "restore") {
            cli.hasRightOrRefuse('create-entities') && elib.restore(db.mongoID(cli.routeinfo.path[3]), cli.postdata.data.address, () => { 
                elib.sendNewMagicEmail(cli, db.mongoID(cli.routeinfo.path[3]), () => { 
                    cli.sendJSON({ ok : 1 }); 
                });
            });
        } else if (cli.routeinfo.path[2] == "magiclink") {
            cli.hasRightOrRefuse('edit-entities') && elib.sendNewMagicEmail(cli, db.mongoID(cli.routeinfo.path[3]), () => { cli.sendJSON({ ok : 1 }); });
        } else {
            if (cli.hasRight('edit-entities')) {
                elib.createFromCli(cli);
            } else {
                cli.refuse();
            }
        }
    }

    apiGET(cli) {
        if (cli.routeinfo.path[2] == "list" && cli.hasAPIRight("list-entities")) {
            db.find(require('./lib/config').default(), 'entities', {}, [], (err, cursor) => {
                cursor.project({ displayname : 1, revoked : 1, email : 1, username : 1 })
                    .sort({revoked : 1, displayname : 1})
                    .toArray((err, arr) => {
                    cli.sendJSON(arr);
                });
            })
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    apiPOST(cli) {
        cli.throwHTTP(404, undefined, true);
    }

    livevar  (cli, levels, params, sendback) {
        var allEntities = levels.length === 0;

        if (allEntities) {
            db.findToArray(_c.default(), 'entities', cli.hasRight('list-entities') ? {} : {
                _id : db.mongoID(cli.session.data._id)
            }, function(err, arr) { 
                sendback(arr); 
            });
        } else if (levels[0] == "me") {
            db.findUnique(_c.default(), "entities", { _id : db.mongoID(cli.userinfo.userid) }, (err, user) => {
                db.join(_c.default(), 'roles', [
                    { $match : { name : { $in : user.roles } } },
                    { $unwind : "$rights" },
                    { $group : { _id : "rights", rights : { $push : "$rights" } } }
                ], arr => {
                    const rights = arr && arr[0] ? arr[0].rights : [];

                    require('./lib/crew').getCrewList({ _id : db.mongoID(cli.userinfo.userid) }, data => sendback(data ? {
                        badges : data.badges,
                        huespin : data.huespin, 
                        levels : data.levels, 
                        user : Object.assign(user, data.items[0], { rights })
                    } : { error : "Not found" }));              
                });
            }, ME_PROJECTION)
        } else if (levels[0] == "bunch") {
            const filters = params.filters || {};
            const $match = { };
            const $sort = { };

            if (filters.status == "revoked") {
                $match.revoked = true;
            } else if (filters.status == "not-revoked") {
                $match.revoked = { $ne : true }
            }

            switch (filters.sort) {
                case "displayname-az": $sort.displayname = 1; break;
                case "displayname-za": $sort.displayname = -1; break;
                case "latest-logged" : $sort.lastLogin = -1; break;
                case "newest" : $sort._id = -1; break;
                case "oldest" : $sort._id = 1; break;
                default: $sort._id = -1;
            }

            if (filters.search && filters.search.trim()) {
                const reg = new RegExp(filters.search, 'i');
                $match.$or = [
                    { username : reg },
                    { displayname : reg }
                ];
            }

            if (filters.role && filters.role != "all") {
                $match.roles = filters.role;
            }

            cli.hasRightOrRefuse('list-entities') && db.join(_c.default(), 'entities', [
                { $match },
                { $sort }
            ], users => {
                sendback({ items : users, length : users.length });
            });
        } else if (levels[0] == "exists") {
            db.findUnique(_c.default(), 'entities', { username : levels[1] }, (err, user) => {
                sendback({ exists : !!user, user });
            }, {_id : 1, displayname : 1, username : 1, avatarURL : 1 });
        } else if (levels[0] == "chat") {
            db.find(_c.default(), 'entities', {revoked : {$ne : true}}, [], function(err, cur) {
                cur.sort({fullname : 1}).toArray(function(err, arr) {
                    sendback(err || arr);
                });
            }, {
                displayname : 1, 
                avatarURL : 1
            });
        } else if (levels[0] == "dashboardstats") {
            const now = new Date();

            db.join(cli._c, 'content', [
                { $match : { status : "published", author : db.mongoID(cli.userinfo.userid) } },
                { $group : { _id : "$editions", posts : { $sum : 1 } } },
                { $lookup : { from : "editions", as : "editions", localField : '_id', foreignField : '_id' } },
                { $project : { _id : 0, posts : 1, editions : "$editions" } },
                { $sort : { posts : -1 } }
            ], editions => {
                db.join(cli._c, 'content', [
                    { $match : { 
                        status : "published", 
                        author : db.mongoID(cli.userinfo.userid),
                        date : { 
                            $gt : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90) } 
                        } 
                    },
                    { $group : { _id : { $dayOfWeek : "$date" }, published : { $sum : 1 } } },
                    { $sort : { _id : 1 } },
                    { $project : { day : "$_id", published : 1, _id : 0 } }
                ], activity => {
                    sendback({
                        totalposts : editions.reduce((acc, cur) => acc + cur.posts, 0),

                        editions, activity
                    });
                });
            });
        } else if (levels[0] == "cached") {
            db.findToArray(_c.default(), 'entities', {revoked : {$ne : true}}, function(e, a) {sendback(a);}, {displayname : 1, avatarURL : 1});
        } else if (levels[0] == "simple") {
            var simpProj = {
                displayname : 1,
                revoked : 1,
                avatarURL : 1,
                _id : 1
            };
        
            var match = {};

            if (levels[1] == "active") {
                match.revoked = {$ne : true};
            }

            db.find(_c.default(), 'entities', match, [], function(err, cur) {
                cur.project(simpProj).sort({displayname : 1}).toArray(function(err, arr) {
                    let revoked = [];
                    let active = [];
                    arr.forEach(x => {
                        if (x.revoked) {
                            x.displayname += " (inactive)";
                            revoked.push(x);
                        } else {
                            active.push(x);
                        }
                    });
                    sendback([...active, ...revoked]);
                });
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
                sendback(err || arr);
            });
        } else if (levels[0] == 'table') {
            if (!cli.hasRight('list-entities')) {
                sendback({size:0,data:[]});
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

                db.count(_c.default(), 'entities', mtch, (err, total) => {
                    sendback({
                        size : total,
                        data : data
                    });
                });
            });
        } else if (levels[0] == 'single' && levels[1]) {
            if (!cli.hasRight('list-entities') && levels[1] !== cli.session.data._id) {
                sendback([]);
            } else {
                db.findUnique(_c.default(), 'entities', {_id: db.mongoID(levels[1])}, (err, entity) => {
                    sendback({err, entity});
                });
            }
        } else {
            if (!cli.hasRight('list-entities') && levels[0] !== cli.session.data.username) {
                sendback([]);
            } else {
                db.multiLevelFind(_c.default(), 'entities', levels, {
                    username: levels[0]
                }, {
                    limit: [1]
                }, sendback);
            }
        }
    };

    setup () {
        livevars.registerLiveVariable('me', function (cli, levels, params, callback) {
            db.findUnique(_c.default(), 'entities', {
                _id: db.mongoID(cli.session.data._id)
            }, (err, user) => {
                if (user) {
                    db.join(_c.default(), 'roles', [
                        { $match : { name : { $in : user.roles } } },
                        { $unwind : "$rights" },
                        { $group : { _id : "rights", rights : { $push : "$rights" } } }
                    ], arr => {
                        const rights = arr && arr[0] ? arr[0].rights : [];
                        user.rights = Array.from(new Set(rights.filter(x => x)));

                        callback([ user ]);
                    });
                } else {
                    callback({ error : 'Not found' });
                }
            });
        });

        require('../backend/admin').registerAdminEndpoint('initialLogin', 'POST', cli => {
            elib.commitProfilePic(cli, cli.postdata.data.picture, (err, images) => {
                const displayname = cli.postdata.data.displayname;
                const split = displayname.split(' ');

                const payload = {
                    shhh : CryptoJS.SHA256(cli.postdata.data.password).toString(CryptoJS.enc.Hex),
                    displayname,
                    firstname : split.shift(),
                    lastname : split.join(' '),
                    welcomed : true,
                    welcomedAt : new Date(),
                    phone : cli.postdata.data.phone.replace(/([^0-9])/g, '')
                }

                db.update(require('./lib/config').default(), 'entities', { _id : db.mongoID(cli.userinfo.userid) }, payload, () => {
                    cli.sendJSON({avatarURL : images.square.url});
                });
            });
        });
    };
};

module.exports = new Entities();
