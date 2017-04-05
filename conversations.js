var log = require('./log.js');
var db = require('./includes/db.js');
var _c = require('./config.js');
var livevars = require('./livevars.js');
var notifications = require('./notifications.js');
var htmlencoder = require('html-entities').Html5Entities;

/*
CONVERSATION DATABASE OBJECT
  _id : ObjectId,
  users : [ObjectId],
  type : EnumString

MESSAGE DATABASE OBJECT
      userid : ObjectId,
      time : Date,
      content : String,
      seen : Boolean,
      type : EnumString
 
*/
class Message {
    constructor(og) {
        if (typeof og == "object") {
            this.userid = og.userid;
            this.time = og.time;
            this.content = og.content;
            this.seen = og.seen;
            this.type = og.type;
            this.conversationid = og.conversationid;
            this._id = og._id;
        }
    }
}

class Converstaion {
    constructor(og) {
        if (og) {
            this.users = og.users;
            this.type = og.type;
            this._id = og._id;
        } else {
            this.users = [];
            this.type = "private";
        }
    }
}

var LMLConversations = function() {

};

var parsePseudoMarkup = function(str) {
    return str.replace(/\n/g, '<br />').trim();
};

LMLConversations.prototype.adminPOST = function(cli) {
    var conversationid = cli.routeinfo.path[2];

    if (cli.routeinfo.path[3] == "send") {
        db.find(_c.default(), 'conversations', {
            _id : db.mongoID(conversationid)
        }, [], function(err, cur) {
            cur.hasNext(function(err, hasnext) {
                if (hasnext) {
                    cur.next(function(err, conv) {
                        if (conv.users.indexOf(cli.userinfo.userid) == -1) {
                            var msg = {
                                userid : cli.userinfo.userid,
                                time : new Date(),
                                content : parsePseudoMarkup(htmlencoder.encode(cli.postdata.data.c)),
                                seen : false,
                                type : cli.postdata.data.t,
                                conversationid : db.mongoID(conversationid)
                            }
                            db.insert(_c.default(), 'messages', msg, function(err, res) {
                                db.update(_c.default(), 'conversations', 
                                    {_id : db.mongoID(conversationid)}, 
                                    {uptodate : [db.mongoID(cli.userinfo.userid)]}, 
                                function() {
                                    cli.sendJSON({err : undefined, success : true, id : res.insertedId});

                                    for (var i = 0; i < conv.users.length; i++) if (conv.users[i].toString() != cli.userinfo.userid) {
                                        msg.type = conv.type;
                                        msg.convid = conv._id;
                                        notifications.messageNotif(conv.users[i], msg);
                                    }
                                });
                            });
                        } else {
                            cli.sendJSON({err : "NOT IN CONVERSATION"});
                        }
                    });
                } else {
                    cli.sendJSON({err : "NOT FOUND"})
                }
            });
        });
    } else if (cli.routeinfo.path[3] == "read") {
        db.update(_c.default(), 'conversations', {
            _id : db.mongoID(conversationid)
        },{
            $addToSet : {uptodate : cli.userinfo.userid}
        }, function(err, r) {
            var people = r.value.users;
            for (var i = 0; i < people.length; i++) if (people[i] != cli.userinfo.userid) {
                notifications.messageNotif(people[i], {convid : r.value._id, userid : cli.userinfo.userid}, 'readreport');
            }
            cli.sendJSON({read : true});
        }, false, true, true, true);
    } else if (cli.routeinfo.path[3] == "create") {
        var topic = cli.postdata.data.topic;
        var people = JSON.parse(cli.postdata.data.people);
        var peopleids = new Array(people.length + 1);
        for (var i = 0; i < people.length; i++) {
            peopleids[i] = db.mongoID(people[i]);
        }

        peopleids[peopleids.length - 1] = db.mongoID(cli.userinfo.userid);

        var newconv = {
            type : "group",
            users : peopleids,
            uptodate : peopleids,
            topic : topic
        };
        db.insert(_c.default(), 'conversations', newconv, function(err, res) {
            newconv._id = res.insertedId;
            newconv.created = true;
            cli.sendJSON(newconv);

            for (var i = 0; i < people.length; i++) if (people[i] != cli.userinfo.userid) {
                notifications.messageNotif(people[i], newconv, 'newchatgroup');
            }
        });
    } else {
        cli.throwHTTP(404, 'NOT FOUND');
    }
};

LMLConversations.prototype.adminGET = function(cli) {
    if (cli.routeinfo.path[2] == "find") {
        var type = cli.routeinfo.params.type;
        var participants = [db.mongoID(cli.userinfo.userid), db.mongoID(cli.routeinfo.params.with)];

        db.find(_c.default(), 'conversations', {type : type, users : {$all : participants}}, [], function(err, cur) {
            cur.hasNext(function(err, hasnext) {
                if (hasnext) {
                    cur.next(function(err, cconv) {
                        cli.sendJSON ({
                            id : cconv._id, 
                            users : participants, 
                            type : type,
                            uptodate : cconv.uptodate
                        });
                    });
                } else if (cli.routeinfo.params.orcreate) {
                    db.insert(_c.default(), 'conversations', {type : type, users : participants, uptodate : participants}, function(err, res) {
                        cli.sendJSON({
                            id : res.insertedId, 
                            users : participants, 
                            uptodate : participants,
                            type : type,
                            created : true
                        });
                    });
                } else {
                    cli.sendJSON({
                        err : "NOT FOUND",
                        cose : 404
                    });
                }
            });
        }, {_id : 1, uptodate : 1});
    } else if(cli.routeinfo.path[2] == "messages") {
        var convid = cli.routeinfo.path[3];
        db.find(_c.default(), 'messages', {conversationid : db.mongoID(convid)}, [], function(err, cur) {
            var limit = parseInt(cli.routeinfo.params.limit);
            var skip = parseInt(cli.routeinfo.params.skip);
            cur.sort({_id : -1}).limit(limit || 30).skip(skip || 0).toArray(function(err, arr) {
                cli.sendJSON({
                    messages : arr.reverse(),
                    count : arr.length
                });
            });
        });
    } else {
        cli.throwHTTP(404, "NOT FOUND");
    }
};

LMLConversations.prototype.livevar = function(cli, levels, params, cb) {
    var userid = cli.userinfo.userid;
    var type = levels[0];
    var convid = levels[1];

    if (type == "private") {
        db.findToArray(_c.default(), 'conversations', params.with ? {
            users : [userid, params.with],
            type : "private"
        } : {
            _id : db.mongoID(convid)
        }, function(err, arr) {
            if (arr.length != 0) {
                db.join(_c.default(), 'messages', [
                    {$match : {conversationid : db.mongoId(arr[0]._id)}},
                    {$sort : {_id : -1}},
                    {$limit : 10}
                ], function(msgs) {
                    arr[0].messages = msgs;
                    cb(arr);
                });
            } else {
                cb();
            }
        });
    } else if (type == "group") {
        
    } else if (type == "list") {
        db.findToArray(_c.default(), 'conversations', {
            users : cli.userinfo.userid,
        }, function(err, arr) {
            cb(arr);
        });
    }
};

module.exports = new LMLConversations();
