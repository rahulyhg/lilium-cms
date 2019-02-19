const _c = require('./lib/config');
const sessionManager = require('./lib/session.js');
const db = require('./lib/db.js');
const metrics = require('./lib/metrics');
const hooks = require('./lib/hooks');
const sites = require('./sites.js');
const livevars = require('./pipeline/livevars');
const sharedcache = require('./lib/sharedcache.js');

let io;
let sockets = {};
let groups = {};
let namespaces = [];
let idToNamespace = {};

class LiliumSocket { 
    constructor(socket, session) {
        this.socket = socket;
        this.session = session;
        this.clientId = session.data._id;
        this.config = _c.fetchConfig(session.data.site);
        this.sid = socket.id;

        this.socket.liliumsocket = this;
    };

    bind() {
        this.socket.on('join', this.join);
        this.socket.on('notification-interaction', this.notificationInteraction);
        this.socket.on('notification-view', this.notificationView);
        this.socket.on('broadcast', this.broadcast);
        this.socket.on('disconnect', this.disconnect);
        this.socket.on('hit', this.hit);
        this.socket.on('alert', this.alert);
        this.socket.on('error', this.error);

        return this;
    }

    join(groupName) {
        var ls = this.liliumsocket;
    }

    hit(param) {
        metrics.plus('socketevents');
        var ls = this.liliumsocket;
        var sid = ls.sid;
        var uid = ls.clientId;
        var path = param.path;

        sharedcache.get("hit_" + sid, data => {
            data && db.insert(ls.config, 'hits', {
                userid : db.mongoID(uid),
                path : data.path,
                timespent : Date.now() - data.since,
                since : data.since
            }, () => { });

            sharedcache.set({
                ["hit_" + sid] : {
                    path, since : Date.now()
                }
            }, () => {
                
            });
        });

    };

    disconnect() {
        metrics.minus('loggedinusers');
        metrics.plus('socketevents');
        var ls = this.liliumsocket;
        var sid = ls.sid;
        var uid = ls.clientId;
        
        var memObj = {};
        sharedcache.socket(uid, 'remove', sid, function(remainingSessions) {
            sharedcache.get("hit_" + sid, data => {
                data && db.insert(ls.config, 'hits', {
                    userid : db.mongoID(uid),
                    path : data.path,
                    timespent : Date.now() - data.since,
                    since : data.since
                }, () => { });

                sharedcache.unset('hit_' + sid);
            });
            /*
            var sessionCount = remainingSessions.length;
            for (var i = 0; i < namespaces.length; i++) {
                require('./inbound.js').io().of(namespaces[i]).emit('userstatus', {
                    id: ls.clientId,
                    displayname: ls.session.data.displayname,
                    status : !sessionCount ? 'offline' : 'online',
                    seshCount : sessionCount
                });
            }
            */
        });
    };

    notificationInteraction(notifId) {
        metrics.plus('socketevents');
        var ls = this.liliumsocket;
        var id = db.mongoID(notifId);
        var userId = db.mongoID(ls.clientId);
        // Update notification as interacted
        db.update(ls.config, 'notifications', {
            _id: id,
            userID: userId
        }, {
            interacted: true
        }, function (err, res) {
            // No need for confirmation client side
        });

        // Find notification in session
        for (var index in ls.session.data.notifications) {
            if (ls.session.data.notifications[index]._id == notifId) {
                ls.session.data.notifications[index].interacted = true;
                break;
            }
        }

        // Bypass session manager taking only a cli
        var cli = {};
        cli.session = ls.session;
        cli._c = {};
        cli._c.id = ls.session.data.site;

        // Save it
        sessionManager.saveSession(cli, function () {});
    };

    notificationView() {
        metrics.plus('socketevents');
        var ls = this.liliumsocket;
        ls.session.data.newNotifications = 0;
        // Bypass session manager taking only a cli
        var cli = {};
        cli.session = ls.session;
        cli._c = {};
        cli._c.id = ls.session.data.site;
        // Save it
        sessionManager.saveSession(cli, function () {});

    };

    broadcast(emission) {
        metrics.plus('socketevents');
        var ls = this.liliumsocket;
    };

    alert() {
        metrics.plus('socketevents');
        this.broadcast.emit('message', {
            username: this.username
        });
    };

    error(err) {
        metrics.plus('socketevents');
        log('Socket', 'Error with socket : ' + err.message, 'err');
        log('Stacktrace', err.stack, 'err');
    };
};

var Notification = function () {
    var that = this;

    var onSocketConnection = function (socket, uid) {
        // Parse cookie and get session id
        var cookies = socket.handshake.headers.cookie;
        var split = cookies.split(';');
        var sessionId;

        for (var i = 0; i < split.length; i++) {
            if (split[i].indexOf('lmlsid' + uid) != -1) {
                sessionId = split[i].split('=')[1];
            }
        }

        if (sessionId) {
            // Get session and get client id
            sessionManager.getSessionFromSID(sessionId, function(session) {
                if (session) {
                    sharedcache.socket(session.data._id, 'add', socket.id, function() { 
                        session.sessionId = sessionId;
                        new LiliumSocket(socket, session).bind();

                        metrics.plus('loggedinusers');
                        metrics.plus('socketevents');
                        for (var i = 0; i < namespaces.length; i++) {
                            require('./pipeline/inbound.js').io().of(namespaces[i]).emit('userstatus', {
                                id: session.data._id,
                                displayname: session.data.displayname,
                                status : 'online',
                                seshCount : 1
                            });
                        }
                    });
                }
            });
        }
    };

    this.init = function () {
        if (global.liliumenv.mode != "script" && !global.liliumenv.caij && !process.env.job) {
            let io = require('./pipeline/inbound.js').io();

            log('Notifications', 'Creating site groups', 'live');
            _c.eachSync(function (conf) {
                var url = conf.server.url + "/";
                var path = url.substring(url.indexOf('/', 2));
                log('Socket', 'Created connection for namespace : ' + path + conf.uid, 'live');
                (function (uid) { 
                    io.of(path + uid).on('connection', function(socket) {
                        onSocketConnection(socket, uid);
                    });
                })(conf.uid);
                
                namespaces.push(path + conf.uid);
                idToNamespace[conf.id] = path + conf.uid
            });

            log('Notifications', 'Sockets ready', 'live');
        }
    };

    this.notifyUser = function (userID, dbId, notification, difftype) {
        if (global.liliumenv.mode == "script" || global.liliumenv.caij) { return; }

        //Check if user will receive notification
        notification.interacted = false;
        notification.userID = db.mongoID(userID);
        notification.date = new Date();

        // Add it in the user session if it exsists
        !difftype && db.insert(dbId, 'notifications', notification, function () {});

        // Send to every sockets connected by the user (for multi-tab)
        sharedcache.getSocketID(userID, function(sockets) {
            for (var i = 0; i < sockets.length; i++) {
                var split = sockets[i].split('#');
                
                log('Notifications', 'Emit "'+(difftype||"notification")+'" to socket id ' + split[1] + " of " + split[0], 'live')
                require('./pipeline/inbound.js').io().of(split[0]).to(sockets[i]).emit(difftype || 'notification', notification);
                metrics.plus('socketevents');
            }
        });
    };

    var insertNotificationInSession = function (sessionId, notification, dbId) {
        sessionManager.getSessionFromSID(sessionId, function(session) {
            if (session) {
                session = insertNotif(session, notification);

                // Bypass session manager taking only a cli
                var cli = {};
                cli.session = session;
                cli._c = {};
                cli._c.id = dbId;
                // Save it
                sessionManager.saveSession(cli, function () {});
            }
        });
    };

    var insertBatchNotificationInSessions = function (sessionsIDs, notification, site) {
        var sessions = sessionManager.getSessions();
        var tokens = [];
        for (var sessionID in sessionsIDs) {
            var session = sessions[sessionsIDs[sessionID]._id];
            if (session) {
                tokens.push(sessionsIDs[sessionID]._id)
                insertNotif(session, notification);
            }
        }

        db.update((site || _c.default()), 'sessions', {
            'token': {
                '$in': tokens
            }
        }, {
            '$push': {
                'data.notifications': notification
            },
            $inc: {
                'data.newNotifications': 1
            }
        }, function (err, result) {}, true, false, true);
    };

    var insertNotif = function (session, notification) {
        if (session) {
            if (!session.data.newNotifications) {
                session.data.newNotifications = 0;
            }

            session.data.newNotifications += 1;

            if (!session.data.notifications || typeof session.data.notifications.push == 'undefined') {
                session.data.notifications = [];
            }

            // Only keep last 5 notifs in session
            if (session.data.notifications.length >= 5) {
                //Remove last notification (oldest)
                session.data.notifications.shift();
            }
            //Remove last notification (oldest)
            session.data.notifications.push(notification);
            return session;
        }
    };

    this.emitToWebsite = function (siteid, data, type) {
        metrics.plus('socketevents');
        require('./pipeline/inbound.js').io().of(idToNamespace[siteid]).emit(type || 'notification', data);
    };

    this.messageNotif = function(user, msg, type) {
        metrics.plus('socketevents');
        sharedcache.getSocketID(user, function(sockets) {
            for (var i = 0; i < sockets.length; i++) {
                var split = sockets[i].split('#');
                
                log('Notifications', 'Emit to socket id ' + split[1] + " of " + split[0], 'live')
                require('./pipeline/inbound.js').io().of(split[0]).to(sockets[i]).emit(type || 'message', msg);
            }
        });
    };

    this.createGroup = function() {
        log('Notifications', 'Warning : Call to deprecated function createGroup', 'warn');
    }

    this.broadcastNotification = function (notification) {
        notification.date = new Date();
        notification.interacted = false;
        var sites = sites.getSites();

        var broadcast = function (site) {
            // Create notification for users that have dash access
            db.aggregate(site, 'entities', [{
                "$unwind": "$roles"
            }, {
                "$lookup": {
                    from: "roles",
                    localField: "roles",
                    "foreignField": "name",
                    as: "rights"
                }
            }, {
                "$match": {
                    "rights.rights": {
                        $in: ["dash"]
                    }
                }
            }, {
                "$project": {
                    "_id": 0,
                    "userID": "$_id",
                    "type": {
                        "$literal": notification.type
                    },
                    "msg": {
                        "$literal": notification.msg
                    },
                    "title": {
                        "$literal": notification.title
                    },
                    "url": {
                        "$literal": notification.url
                    },
                    "interacted": {
                        "$literal": false
                    },
                    "date": {
                        "$literal": notification.date
                    }
                }
            }], function (result) {
                // Insert Notifications
                db.insert(site, 'notifications', result, function (err, r) {});
            });

            // Insert notification in all the sessions
            // Find sessions that have dash access
            db.aggregate(site, 'sessions', [{
                "$unwind": "$data.roles"
            }, {
                $lookup: {
                    from: "roles",
                    localField: "data.roles",
                    foreignField: "name",
                    as: "roles"
                }
            }, {
                $match: {
                    "roles.rights": {
                        $in: ["dash"]
                    }
                }
            }, {
                $group: {
                    _id: "$token"
                }
            }], function (result) {
                insertBatchNotificationInSessions(result, notification, site);
            });
        };

        for (var i in sites) {
            broadcast(sites[i].id);
        }

        require('./pipeline/inbound.js').io().sockets.emit('notification', notification);
    };

    this.broadcast = function (data, msgType) {
        metrics.plus('socketevents');
        for (var i = 0; i < namespaces.length; i++) {
            require('./pipeline/inbound.js').io().of(namespaces[i]).emit(msgType || 'message', data);
        }
    };

    this.adminPOST = function(cli) {
        switch (cli.routeinfo.path[2]) {
            case "seeall" : {
                db.update(cli._c, 'notifications', { userID : db.mongoID(cli.userinfo.userid), interacted : false }, { interacted : true }, (err, r) => {
                    err ? cli.throwHTTP(500, err, true) : cli.sendJSON({ updated : !!r.result.modifiedCount, total : r.result.modifiedCount });
                })
            } break;

            case "seeone" : {
                db.update(cli._c, 'notifications', { userID : db.mongoID(cli.userinfo.userid), _id : db.mongoID(cli.routeinfo.path[3]) }, { interacted : true }, (err, r) => {
                    err ? cli.throwHTTP(500, err, true) : cli.sendJSON({ updated : !!r.result.modifiedCount });
                })
            } break;

            default : cli.throwHTTP(404, undefined, true);
        }
    }

    this.registerLiveVar = function() {
        livevars.registerLiveVariable('notifications', function(cli, levels, params, cb) {
            if (levels[0] == "unreadcount") {
                db.count(cli._c, 'notifications', { userID : db.mongoID(cli.userinfo.userid), interacted : false }, (err, unreadCount) => {
                    cb({unreadCount});
                })
            } else if (levels[0] == "all") {
                const $skip = params.skip || 0;
                const $limit = params.limit || 10;
                db.join(cli._c, 'notifications', [
                    {$match : {
                        userID : db.mongoID(cli.userinfo.userid)
                    }},
                    {$sort : {_id : -1}},
                    {$skip}, {$limit}
                ], all => {
                    cb(all);
                });
            } else {
                const $skip = params.skip || 0;
                const $limit = params.limit || 10;
                db.join(cli._c, 'notifications', [
                    {$match : {
                        userID : db.mongoID(cli.userinfo.userid),
                        interacted : true
                    }},
                    {$sort : {_id : -1}},
                    {$skip}, {$limit},
                    {$sort : {_id : 1}}
                ], seen => db.findToArray(cli._c, 'notifications', { userID : db.mongoID(cli.userinfo.userid), interacted : false }, (err, unseen) => {
                    cb({ seen, unseen });
                }));
            }
        });

        livevars.registerLiveVariable('online', function(cli, levels, params, cb) {
            if (levels[0] == "list") {
                sharedcache.getSocketID(false, function(sockets) {
                    cb(sockets);
                });
            } else if (levels[0] == "hits") {
                sharedcache.hit('dump', undefined, undefined, (list) => {
                    db.findToArray(_c.default(), 'entities', { _id : { $in : Object.keys(list).map(x => db.mongoID(x)) }}, (err, users) => {
                        users.forEach(x => { x.path = list[x._id]; });
                        cb(users);
                    }, { displayname : 1, _id : 1, avatarURL : 1 });
                });
            } else {
                return cb({users : [], sessions : {}});
            }
        }, ["dash"]);
    };
};

module.exports = new Notification();
