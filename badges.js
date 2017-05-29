const log = require('./log.js');
const db = require('./includes/db.js');
const config = require('./config.js');
const networkinfo = require('./network/info.js');
const hooks = require('./hooks.js');
const notifications = require('./notifications.js');
const noop = () => {};

// Endpoint : Decorations
const BADGE_CACHE_KEY = "systembadges";
const DECO_COLLECTION = "decorations";
const BADGES_COLLECTION = "badges";
const ADMIN_POST_RIGHT = "manage-badges";
const ADMIN_GET_RIGHT = "manage-badges";

const DEFAULT_HOOKS_PRIO = 10000;

/*
    DATABASE SCHEMA ---

    EntityBadge : { 
        entity : ObjectId, 
        badge : ObjectId,
        level : Number(1, n),
        receivedOn : Date,
        issuer : ObjectId || String("system")
    }

    BADGES CONDITIONS ---

    [ ] Published <n> articles total
    [ ] Published <n> articles in one day
    [ ] Wrote <n> paragraphs
    [ ] Used <n> images in articles
    [ ] Article got <n> shares in 48h
    [ ] Got top article <n> times
    [ ] Logged in <n> days
    [ ] Has a total of <n> ads
    [ ] Written <n> sponsored articles
    [ ] Previewed articles <n> times
    [ ] Updated password <n> times
    [ ] Submitted <n> tickets
    [ ] Submitted <n> change requests
*/

const DEFAULT_BADGES = [
    {slug : "publish-n", 
        displayname : "Artist",
        levels : [2, 10, 50, 100, 1000, 2000, 5000, 10000],
        reason : "For publishing <n> articles", icon : "fa-paper-plane-o", hook : "article_published_from_draft", immutable : true},
    {slug : "publish-today-n", 
        displayname : "Vigorous",
        levels : [1, 2, 4, 5, 6, 8, 10, 12],
        reason : "For publishing <n> article in one day", icon : "fa-calendar-check-o", hook : "article_published_from_draft", immutable : true},
    {slug : "write-n-parags", 
        displayname : "Descriptor",
        levels : [20, 100, 500, 2000, 10000, 50000, 100000, 1000000],
        reason : "For writing <n> paragraph blocks", icon : "fa-paragraph", hook : "article_published_from_draft", immutable : true},
    {slug : "use-n-images", 
        displayname : "Photographer",
        levels : [20, 100, 500, 2000, 10000, 50000, 100000, 1000000],
        reason : "For using <n> images", icon : "fa-camera-retro", hook : "article_published_from_draft", immutable : true},
    {slug : "n-shares-48h", 
        displayname : "Swift",
        levels : [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
        reason : "For getting <n> shares in 48h on one article", icon : "fa-share-alt", hook : "time_is_midnight", immutable : true},
    {slug : "top-article-n-times", 
        displayname : "Rockstar",
        levels : [5, 10, 15, 20, 50, 100, 150, 250],
        reason : "For getting top article <n> times", icon : "fa-rocket", hook : "time_is_5am", immutable : true},
    {slug : "log-in-n-times", 
        displayname : "Regular",
        levels : [5, 10, 20, 50, 80, 180, 365, 500],
        reason : "Logged in <n> times", icon : "fa-key", hook : "user_loggedin", immutable : true},
    {slug : "total-n-ads", 
        displayname : "Advertiser",
        levels : [20, 100, 500, 2000, 10000, 50000, 100000, 1000000],
        reason : "For Generating <n> content ads", icon : "fa-money", hook : "article_published_from_draft", immutable : true},
    {slug : "n-sponsored", 
        displayname : "Influencer",
        levels : [2, 4, 8, 12, 20, 50, 80, 200],
        reason : "For publishing <n> sponsored articles", icon : "fa-handshake-o", hook : "article_published_from_draft", immutable : true},
    {slug : "preview-n-times", 
        displayname : "Perfectionist",
        levels : [2, 10, 50, 100, 1000, 2000, 5000, 10000],
        reason : "For previewing articles <n> times", icon : "fa-eye", hook : "article_previewed", immutable : true},
    {slug : "update-pwd-n-times", 
        displayname : "Guardian",
        levels : [2, 5, 10, 20, 50, 100, 200, 500],
        reason : "For updating your password <n> times", icon : "fa-shield", hook : "password_updated", immutable : true},
    {slug : "submit-n-tickets", 
        displayname : "Defender",
        levels : [2, 5, 10, 20, 30, 40, 50, 100],
        reason : "Submitted <n> tickets", icon : "fa-ticket", hook : "issue_submitted", immutable : true},
    {slug : "submit-n-change-req", 
        displayname : "Visionary",
        levels : [2, 5, 10, 20, 30, 40, 50, 100],
        reason : "Submitted <n> change requests", icon : "fa-globe", hook : "cr_submitted", immutable : true}
];

const BADGE_LEVEL_TEXT = [
    "Novice", "Apprentice", "Skilled", "Senior",
    "Guru", "Supreme", "Master", "Legend"
];

const DEFAULT_BADGES_ASSOC = {};
DEFAULT_BADGES.forEach(x => { DEFAULT_BADGES_ASSOC[x.slug] = x; });

const BADGE_VALIDATORS = {
    "publish-n" : (data, done) => {
        db.count(data._c, 'content', {author : data.article.author}, (err, count) => {
            BadgeValidator.check(data._c, data.article.author, "publish-n", count, done);
        });
    }, "publish-today-n" : (data, done) => {
        let filter = {
            author : data.article.author,
            date : {
                $lt  : new Date().setHours(23,59,59,999),
                $gte : new Date().setHours(0, 0, 0, 0)
            }
        }
        db.count(data._c, 'content', filter, (err, count) => {
            BadgeValidator.check(data._c, data.article.author, "publish-today-n", count, done);
        });
    }, "write-n-parags" : (data, done) => {

    }, "use-n-images" : (data, done) => {

    }, "n-shares-48h" : (data, done) => {

    }, "top-article-n-times" : (data, done) => {

    }, "log-in-n-times" : (data, done) => {

    }, "total-n-ads" : (data, done) => {

    }, "n-sponsored" : (data, done) => {

    }, "preview-n-times": (data, done) => {

    }, "update-pwd-n-times": (data, done) => {

    }, "submit-n-tickets" : (data, done) => {

    }, "submit-n-chage-req" : (data, done) => {

    }
};

class BadgeValidator {
    static validate(slug, data, callback) {
        BADGE_VALIDATORS[slug](data, callback || noop);
    }

    static check(_c, entity, slug, count, done) {
        db.count(config.default(), 'decorations', {entity, slug}, (err, decoration) => {
            let nextLevel = decoration ? (decoration.level + 1) : 0;
            let prospect = DEFAULT_BADGES_ASSOC[slug];
            let nextValue = prospect.levels[nextLevel];

            if (count >= nextValue) {
                let query = {};
                if (!decoration) {
                    decoration = {
                        level : -1,
                        entity,
                        slug 
                    };
                } else {
                    query._id = decoration._id;
                }

                decoration.level++;
                decoration.unread = true;
                decoration.on = new Date();
                
                db.update(config.default(), 'decorations', query, decoration, () => {
                    notifications.notifyUser(entity.toString(), _c.id, {mustfetch : true}, 'newbadge');

                    done && done(true, {
                        badge : prospect, 
                        level : nextLevel
                    });
                }, true, true);
            } else {
                done && done(false);
            }
        });
    }
}

class Badge {
    constructor(dbid) {
        this.badgeID = dbid;
    }

    static fromDatabase(schema) {
        let badge = new Badge(schema._id);
        for (let k in schema) {
            badge[k] = schema[k];
        }

        return badge;
    }
}

class EntityBadge {
    constructor() {
        this.badge;
        this.entity;
        this.receivedOn = new Date();
        this.level;
        this.issuer; // Either an entity ID, or "system" ; At some point, users will be able to reward each other
    }

    static fetchEntityDecorations(entityID, sendback) {
        db.findToArray(config.default(), DECO_COLLECTION, {entity}, (err, arr) => {
            arr.forEach(b => {
                b.badgeObject = DEFAULT_BADGES_ASSOC[b.badge];
            });

            send(arr);
        });
    }

    static generateBadgeNotification(entity, badgeslug, level) {
        let badge = DEFAULT_BADGES_ASSOC[badgeslug];

        return {
            image : (Math.floor(level / 2) + 1) + ".png",
            icon : "fa " + badge.icon,
            text : badge.displayname + " - " + BADGE_LEVEL_TEXT[level],
            reason : badge.reason.replace("<n>", "<b>"+badge.levels[level]+"</b>"),
            hue : level * 35,
            level
        };
    }
}

// Exported singleton //////
class BadgesAPI {
    fetchEntityDeco(entity, send) {
        EntityBadge.fetchEntityDecorations(entity, send);
    }

    fetchAllDeco(send) {
        send(DEFAULT_BADGES);
    }

    fetchOneDeco(slug, send) {
        send(DEFAULT_BADGES_ASSOC[slug]);
    }

    adminGET(cli) {
        let action = cli.routeinfo.path[1];
        switch (action) {
            case "fetch" : 
                db.findToArray(config.default(), 'decorations', {entity : db.mongoID(cli.userinfo.userid), unread : true}, (err, arr) => {
                    let badges = [];
                    arr.forEach(x => badges.push(EntityBadge.generateBadgeNotification(x.entity, x.badge, x.level)));
                    cli.sendJSON({
                        hasNew : arr.length,
                        badges
                    });

                    db.update(config.default(), "decorations", {entity : db.mongoID(cli.userinfo.userid)}, {unread : false}, noop)
                });
                break;
            default:
                cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {
        // Allowed top levels : create, edit, give, take
        if (!cli.hasRight(ADMIN_POST_RIGHT)) {
            return cli.throwHTTP(403, undefined, true);
        }
    }

    // decorations
    livevar(cli, levels, params, send) {
        if (levels.length == 0) {
            return send(new Error("Required first level for live variable 'decorations'"));
        }

        // Allowed bot level : entity, all, one
        switch (levels[0]) {
            case "entity": this.fetchEntityDeco(db.mongoID(levels[1]), send); break;
            case "all": this.fetchAllDeco(send); break;
            case "one": this.fetchOneDeco(db.mongoID(levels[1]), send); break;
            default: send(new Error("Undefined top level " + levels[0]))
        }
    }

    registerHooks() {
        DEFAULT_BADGES.forEach(b => {
            hooks.register(b.hook, DEFAULT_HOOKS_PRIO, (pkg) => {
                BadgeValidator.validate(b.slug, pkg)
            });
        });
    }

    setup() {
        this.registerHooks();
    }
}

const badgesAPI = new BadgesAPI();
module.exports = badgesAPI;
