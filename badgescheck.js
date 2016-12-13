var log = require('./log.js');
var db = require('./includes/db.js');
var feed = require("./feed.js");
var config = require('./config.js');

module.exports = function(BadgeWrapper) {
    if (typeof BadgeWrapper === "undefined") {
        throw new Error("Undefined BadgeWrapper class.");
    }

    log('Badges', 'Defining badge checks');

    BadgeWrapper.prototype.checkFor_publish = function(cli, site, user, cb) {
        var that = this;
        user.badges = user.badges || {};

        // Looking to be equal or greater than this number + 1
        var current = typeof user.badges.artist == "undefined" ? -1 : user.badges.artist; 
        var scales = site.userBadges.artist.ranks;

        db.count(cli._c, "content", {
            author : db.mongoID(user._id), 
            status : "published"
        }, function(err, count) {
            if (err) {
                log("Badges", "Could not check for published articles, user " + user.username + " because : " + err);
                cb(false);
            } else if (count >= scales[current+1]) {
                var newLevel = current+1;
                while (count >= newLevel+1) {newLevel++;}

                that.acquire(cli, site, user, "artist", newLevel, cb);
                feed.push(user._id, user._id, "badge", config.default(), {
                    level : newLevel,
                    count : count,
                    badge : "artist"
                });
            } else {
                log('Badges', "No artist badge was acquired for " + user.username + " because " + count + " < " + scales[current+1]);
                cb(false);
            }
        });
    };

    BadgeWrapper.prototype.checkFor_edit = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_user = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_login = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_upload = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_nsfw = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_lys = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_unpublish = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_report = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_password = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_dashboard = function(cli, site, user, cb) {cb(false);};
    BadgeWrapper.prototype.checkFor_search = function(cli, site, user, cb) {cb(false);};

    log('Badges', 'Added all badge checks');
};
