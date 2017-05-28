const log = require('./log.js');
const db = require('./includes/db.js');
const config = require('./config.js');
const networkinfo = require('./network/info.js');
const noop = () => {};

// Endpoint : Decorations
const BADGE_CACHE_KEY = "systembadges";
const DECO_COLLECTION = "decorations";
const BADGES_COLLECTION = "badges";
const ADMIN_POST_RIGHT = "manage-badges";
const ADMIN_GET_RIGHT = "manage-badges";

/*
    DATABASE SCHEMA ---

    EntityBadge : { 
        entity : ObjectId, 
        badge : ObjectId,
        level : Number(1, n),
        receivedOn : Date,
        issuer : ObjectId || String("system")
    }

    Badge : {
        _id : ref by EntityBadge,
        slug : String, index,
        reason : String,
        displayname : String,
        imgPath : String(),
        hook : String(function),
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
        reason : "Published <n> articles", imgPath : "", hook : "article_published", immutable : true},
    {slug : "publish-today-n", 
        displayname : "Vigorous",
        levels : [1, 2, 4, 5, 6, 8, 10, 12],
        reason : "Published <n> article today", imgPath : "", hook : "article_published", immutable : true},
    {slug : "write-n-parags", 
        displayname : "Descriptor",
        levels : [20, 100, 500, 2000, 10000, 50000, 100000, 1000000],
        reason : "Wrote <n> paragraph blocks", imgPath : "", hook : "article_published", immutable : true},
    {slug : "use-n-images", 
        displayname : "Photographer",
        levels : [20, 100, 500, 2000, 10000, 50000, 100000, 1000000],
        reason : "Used <n> images", imgPath : "", hook : "article_published", immutable : true},
    {slug : "n-shares-48h", 
        displayname : "Swift",
        levels : [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
        reason : "Article got <n> shares in 48h", imgPath : "", hook : "time_is_midnight", immutable : true},
    {slug : "top-article-n-times", 
        displayname : "Rockstar",
        levels : [5, 10, 15, 20, 50, 100, 150, 250],
        reason : "Got top article <n> times", imgPath : "", hook : "time_is_5am", immutable : true},
    {slug : "log-in-n-times", 
        displayname : "Regular",
        levels : [2, 10, 20, 50, 80, 180, 365, 500],
        reason : "Logged in <n> times", imgPath : "", hook : "user_loggedin", immutable : true},
    {slug : "total-n-ads", 
        displayname : "Advertiser",
        levels : [20, 100, 500, 2000, 10000, 50000, 100000, 1000000],
        reason : "Generated <n> content ads", imgPath : "", hook : "article_published", immutable : true},
    {slug : "n-sponsored", 
        displayname : "Influencer",
        levels : [2, 4, 8, 12, 20, 50, 80, 200],
        reason : "Wrote <n> sponsored articles", imgPath : "", hook : "article_published", immutable : true},
    {slug : "preview-n-times", 
        displayname : "Perfectionist",
        levels : [2, 10, 50, 100, 1000, 2000, 5000, 10000],
        reason : "Previewed articles <n> times", imgPath : "", hook : "article_previewed", immutable : true},
    {slug : "update-pwd-n-times", 
        displayname : "Guardian",
        levels : [2, 5, 10, 20, 50, 100, 200, 500],
        reason : "Updated password <n> times", imgPath : "", hook : "password_updated", immutable : true},
    {slug : "submit-n-tickets", 
        displayname : "Defender",
        levels : [2, 5, 10, 20, 30, 40, 50, 100],
        reason : "Submitted <n> tickets", imgPath : "", hook : "issue_submitted", immutable : true},
    {slug : "submit-n-change-req", 
        displayname : "Visionary",
        levels : [2, 5, 10, 20, 30, 40, 50, 100],
        reason : "Submitted <n> change requests", imgPath : "", hook : "cr_submitted", immutable : true}
];

const DEFAULT_BADGES_ASSOC = {};
DEFAULT_BADGES.forEach(x => { DEFAULT_BADGES_ASSOC[x.slug] = x; });

const BADGE_VALIDATORS = {
    "publish-n" : (data, done) => {
        // Get all authors article, compare with current level limit
        db.count(data._c, 'content', {author : data.author}, (err, count) => {
            db.count(config.default(), 'decorations', {entity : data.author, slug : "publish-n"}, (err, decoration) => {
                
            });
        });
    }, "publish-today-n" : (data, done) => {

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
    constructor() {
        this.validators = BADGE_VALIDATORS;
    }

    validate(slug, data, callback) {
        slug = slug.replace(/-/g, '');
        if (this.validators[slug]) {
            this.validators[slug](data, callback || noop);
        }
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
}

// Exported singleton //////
class BadgesAPI {
    fetchEntityDeco(entity, send) {
        EntityBadge.fetchEntityDecorations(entity, send);
    }

    fetchAllDeco(send) {
        send(DEFAULT_BADGES);
    }

    fetchOneDeco(_id, send) {
        db.findUnique(config.default(), BADGES_COLLECTION, {_id}, (err, badge) => {
            send(badge);
        });
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
            case "entity": 
                this.fetchEntityDeco(db.mongoID(levels[1]), send); 
                break;

            case "all":
                this.fetchAllDeco(send);
                break;

            case "one":
                this.fetchOneDeco(db.mongoID(levels[1]), send);
                break;

            default:
                send(new Error("Undefined top level " + levels[0]))
        }
    }

    createDefaultBadges(done) {
        // DEPRECATED
    }

    registerHooks() {
        DEFAULT_BADGES.forEach(b => {
            b.hook;
        });
    }

    setup() {
        this.registerHooks();
    }
}

const badgesAPI = new BadgesAPI();
module.exports = badgesAPI;
