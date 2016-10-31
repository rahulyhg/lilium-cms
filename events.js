var config = require('./config.js');
var db = require('./includes/db.js');
var noOp = require('./noop.js');

var Events = function() {};

/*
    Params : 
        OBJECT : Configuration object
        STRING : Category for sorting
        STRING   : Event identifier
        STRING  : String containing username
        OBJECT  : Object containing details. Optional.
*/
var createObject = function(conf, cat, type, user, xtra) {
    return {
        site : conf.id,
        category : cat || "uncategorized",
        type : type || "event",
        user : user || "lilium",
        extra : xtra || {},
        date : new Date()
    };
};

Events.prototype.init = function(conf, cb) {
    db.createCollection(conf.id, 'events', cb || noOp);
};

Events.prototype.register = Events.prototype.r = function(conf, category, type, user, extra, cb) {
    db.insert(conf.id, 'events', createObject(conf, category, type, user, extra), cb || noOp);
};

// Range is {skip, limit}
Events.prototype.getCat = (conf, category, cb, range) => {
    range = range || {skip : 0, limit: 50};
    db.findToArray(conf.id, 'events', {category : category}, cb, undefined, range.skip, range.limit);
};

Events.prototype.getType = (conf, type, cb, range) => {
    range = range || {skip : 0, limit: 50};
    db.findToArray(conf.id, 'events', {type : type}, cb, undefined, range.skip, range.limit);
};

Events.prototype.getUser = (conf, username, cb, range) => {
    range = range || {skip : 0, limit: 50};
    db.findToArray(conf.id, 'events', {user : username}, cb, undefined, range.skip, range.limit);
};

Events.prototype.getDate = (conf, date, cb, range) => {
    range = range || {skip : 0, limit: 50};
    var start = new Date(date);
    start.setHours(0,0,0,0);

    var end = new Date(date);
    end.setHours(23,59,59,999);

    db.findToArray(conf.id, 'events', {date : {$gte: start, $lt: end}}, cb, undefined, range.skip, range.limit);
};

module.exports = new Events();
