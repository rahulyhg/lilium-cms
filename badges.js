/*
    Badges -

    Badges are awarded to users who perform certain interactions with Lilium.
    Database schema is : 
    entities.badges = {
        type : level
    }
*/

// Libs
var log = require('./log.js');
var db = require('./includes/db.js');
var notifications = require('./notifications.js');

// Consts
// Badge colors
var BadgeLevels = [
    "Green",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Rainbow",
    "Master"
];

// Badge System //////////////////////////////////////
var BadgeSystem = function(_c) {
    this.userBadges = {};
    this.teamBadges = {};

    this._c = _c;
};

BadgeSystem.prototype.cacheDatabase = function(cb) {
    var that = this;
    log('Badges', 'Caching badges from database for website with uid : ' + that._c.uid);

    db.findToArray(that._c, "userbadges", {}, function(err, arr) {
        for (var i = 0; i < arr.length; i++) {
            that.userBadges[arr[i].code] = arr[i];
        }

        db.findToArray(that._c, "teambadges", {}, function(err, arr) {
            for (var i = 0; i < arr.length; i++) {
                that.teamBadges[arr[i].code] = arr[i];
            }

            cb();
        });
    });
};

// Sites wrapper /////////////////////////////////////
var BadgeWrapper = function() {};
var sites = {};

BadgeWrapper.prototype.pullSite = function(cli) {
    return sites[cli._c.uid];
};

BadgeWrapper.prototype.listUserBadges = function(_c) {
    return sites[_c.uid].userBadges;
};

BadgeWrapper.prototype.addSite = function(_c, cb) {
    var site = new BadgeSystem(_c);

    log('Badges', 'Adding a website with uid ' + _c.uid);
    site.cacheDatabase(function() {
        sites[_c.uid] = site;
        cb();
    });
};

// First param is ClientObject type
BadgeWrapper.prototype.check = function(cli, context, cb) {
    var site = sites[cli._c.uid];
    var that = this;

    if (typeof that["checkFor_" + context] === "function") {
        db.find(cli._c, 'entities', {_id : db.mongoID(cli.userinfo.userid)}, [], function(err, cur) {
            cur.hasNext(function(err, hasNext) {
                if (!err && hasNext) {
                    cur.next(function(err, user) {
                        if (err) {
                            cb(new Error("[BadgeException] - " + err));
                        } else {
                            that["checkFor_" + context].apply(that, [cli, site, user, cb]);    
                        }
                    });
                } else {
                    cb(new Error("[BadgeException] - Could not find user with id "+ cli.userinfo.userid));
                }
            });
        });
    } else {
        cb(new Error("[BadgeException] - Undefined check context : " + context));
    }
};

// Acquire badge
BadgeWrapper.prototype.acquire = function(cli, site, user, badge, level, cb) {
    var updt = {};
    updt["badges." + badge] = level;

    log("Badges", "User " + user.username + " acquiring badge " + badge + " level " + level);
    db.update(cli._c, 'entities', {_id : user._id}, updt, function() {
        log('Badges', "Badge successfully acquired for user " + user.username);

        notifications.notifyUser(user._id, cli._c.id, {
            title : "Acquired new badge - " + BadgeLevels[level] + " " + site.userBadges[badge].name,
            url : cli._c.server.url + "/admin/badges",
            msg : site.userBadges[badge].condition.replace(' x ', " " + site.userBadges[badge].ranks[level] + " "),
            type : "acquire",
            icon : site.userBadges[badge].icon,
            level : level
        }, "badge");
        
        cb(true, badge, level);
    });
};

BadgeWrapper.prototype.registerLiveVar = function() {
    require('./livevars.js').registerLiveVariable('badges', function(cli, levels, params, cb) {
        switch (levels[0]) {
            case undefined:
            case "user":
                db.findToArray(cli._c, 'userbadges', {}, function(err, arr) {
                    cb(arr);
                });
                break;

            case "team":
                db.findToArray(cli._c, 'teambadges', {}, function(err, arr) {
                    cb(arr);
                });
                break;

            default:
                cb(new Error("[BadgesException] Undefined level " + levels[0] + " for badges live variable"));
        }
    });
};

// First param can be ClientObject type
BadgeWrapper.prototype.getUserBadges = function(_c, useridOrName, cb, isId) {
    var conds = {};
    _c = _c._c || _c;
    if (isId) {
        conds._id = db.mongoID(useridOrName);
    } else {
        conds.username = useridOrName;
    }

    db.findToArray(_c, "entities", conds, function(err, arr) {
        if (!err && arr.length !== 0) {
            cb(arr[0].badges);
        } else {
            cb(new Error(err));
        }
    });
};

// Load all badge checks
require('./badgescheck.js')(BadgeWrapper);

// Export the big thing
module.exports = new BadgeWrapper();
