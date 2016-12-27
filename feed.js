var log = require('./log.js');
var db = require('./includes/db.js');
var config = require('./config.js');
var admin = require('./backend/admin.js');
var livevars = require('./livevars.js');
var filelogic = require('./filelogic.js');

var LMLFeed = function() {};

LMLFeed.prototype.registerAdminEndpoint = function() {
    db.createCollection(config.default(), 'feed', function() {});

    admin.registerAdminEndpoint('feed', 'GET', function(cli) {
        filelogic.serveAdminLML(cli);
    });
};

LMLFeed.prototype.registerLiveVar = function() {
    livevars.registerLiveVariable('feed', function(cli, levels, params, cb) {
        db.find(config.default(), 'feed', {}, [], function(err, cur) {
            cur.sort({_id : -1}).limit(params.limit || 50).skip(params.skip || 0).toArray(function(err, arr) {
                cb(arr.reverse());
            });
        });
    });
};

// Card anatomy
/*
    Someone did something on a website at a time
    Action payload includes copied data, sometimes IDs
*/
LMLFeed.prototype.push = function(extid, actor, action, websiteid, extra, cb, plopbefore) {
    db.insert(config.default(), 'feed', {
        extid : extid,
        actor : actor,
        action : action, 
        site : websiteid, 
        time : new Date(), 
        extra : extra
    }, function() {
        require('./notifications.js').broadcast({
            extid : extid,
            actor : actor,
            action : action, 
            site : websiteid, 
            time : new Date(), 
            extra : extra
        }, 'feed');

        cb && cb();
    });
};

LMLFeed.prototype.plop = function(extid, cb, isDirectId) {
    var conds = {};
    cb = cb || function() {};
    conds[isDirectId ? "_id" : "extid"] = extid;

    db.remove(config.default(), 'feed', conds, cb);
};

module.exports = new LMLFeed();
