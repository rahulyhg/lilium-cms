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
        slug : String,
        displayname : String,
        imgPath : String(),
        checkFunction : String(function),
    }
*/

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

// Exported singleton
class BadgesAPI {
    cacheBadges(done) {
        db.findToArray(config.default(), DECO_COLLECTION, {}, (err, badges) => {
            sharedcache.set({
                [BADGE_CACHE_KEY] : badges
            }, done || noop);
        });
    }

    pullBadgesCache(send) {
        sharedcache.get(BADGE_CACHE_KEY, (obj) => {
            send(obj);
        });
    }

    fetchEntityDeco(entity, send) {
        EntityBadge.fetchEntityDecorations(entity, send);
    }

    fetchAllDeco(send) {
        this.pullBadgesCache(badges => send(badges));
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

    setup() {
        if (networkinfo.isElderChild()) {
            this.cacheBadges();
        }
    }
}

const badgesAPI = new BadgesAPI();
module.exports = badgesAPI;
