const log = require('./log.js');
const db = require('./includes/db.js');
const config = require('./config.js');
const sharedcache = require('./sharedcache.js');
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
        reason : "Published <n> articles",
        imgPath : "", hook : "", immutable : true},
    {slug : "publish-today-n", 
        displayname : "Vigorous",
        reason : "Published <n> article today",
        imgPath : "", hook : "", immutable : true},
    {slug : "write-n-parags", 
        displayname : "Descriptor",
        reason : "Wrote <n> paragraph blocks",
        imgPath : "", hook : "", immutable : true},
    {slug : "use-n-images", 
        displayname : "Photographer",
        reason : "Used <n> images",
        imgPath : "", hook : "", immutable : true},
    {slug : "n-shares-48h", 
        displayname : "Swift",
        reason : "Article got <n> shares in 48h",
        imgPath : "", hook : "", immutable : true},
    {slug : "top-article-n-times", 
        displayname : "Rockstar",
        reason : "Got top article <n> times",
        imgPath : "", hook : "", immutable : true},
    {slug : "log-in-n-times", 
        displayname : "Regular",
        reason : "Logged in <n> times",
        imgPath : "", hook : "", immutable : true},
    {slug : "total-n-ads", 
        displayname : "Advertiser",
        reason : "Generated <n> content ads",
        imgPath : "", hook : "", immutable : true},
    {slug : "n-sponsored", 
        displayname : "Influencer",
        reason : "Wrote <n> sponsored articles",
        imgPath : "", hook : "", immutable : true},
    {slug : "preview-n-times", 
        displayname : "Perfectionist",
        reason : "Previewed articles <n> times",
        imgPath : "", hook : "", immutable : true},
    {slug : "update-pwd-n-times", 
        displayname : "Guardian",
        reason : "Updated password <n> times",
        imgPath : "", hook : "", immutable : true},
    {slug : "submit-n-tickets", 
        displayname : "Defender",
        reason : "Submitted <n> tickets",
        imgPath : "", hook : "", immutable : true},
    {slug : "submit-n-change-req", 
        displayname : "Visionary",
        reason : "Submitted <n> change requests",
        imgPath : "", hook : "", immutable : true}
];

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
        sharedcache.get(BADGE_CACHE_KEY, (badges) => {
            db.findToArray(config.default(), DECO_COLLECTION, {entity}, (err, arr) => {
                arr.forEach(b => {
                    b.badgeObject = badges[b.badge];
                });

                send(arr);
            });
        });
    }
}

// Exported singleton //////
class BadgesAPI {
    cacheBadges(done) {
        db.findToArray(config.default(), DECO_COLLECTION, {}, (err, badges) => {
            sharedcache.set({
                [BADGE_CACHE_KEY] : badges
            }, done || noop);
        });
    }

    fetchEntityDeco(entity, send) {
        EntityBadge.fetchEntityDecorations(entity, send);
    }

    fetchAllDeco(send) {
        sharedcache.get(BADGE_CACHE_KEY, send);
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
        if (networkinfo.isElderChild()) {
            db.insert(config.default(), BADGES_COLLECTION, DEFAULT_BADGES, done);
        }
    }

    setup() {
        if (networkinfo.isElderChild()) {
            this.cacheBadges();
        }
    }
}

const badgesAPI = new BadgesAPI();
module.exports = badgesAPI;
