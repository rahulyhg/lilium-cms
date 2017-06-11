const log = require('./log.js');
const db = require('./includes/db.js');
const filelogic = require('./filelogic.js');
const config = require('./config.js');
const entities = require('./entities.js');

const BADGE_LOOKUP = { from : "decorations", localField : "_id", foreignField : "entity", as : "badges" };
const LIST_PROJECTION = { 
    displayname : 1, badges : 1, 
    avatarURL : 1, description : 1,
    badgecount : { "$size": "$badges" },
    personality : 1
};

class Crew {
    constructor() {

    }

    adminGET(cli) {
        let action = cli.routeinfo.path[2];
        let extra = {
            ds : require('./badges.js').getDecorationSettings()
        };

        switch(action) {
            case undefined:
                filelogic.serveAdminLML3(cli, false, extra);
                break;

            default:
                cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {
    
    }

    getCrewList(query = {}, send) {
        const ds = require('./badges.js').getDecorationSettings();
        const personalities = entities.getPersonalities();
        const $match = {
            revoked : {$ne : true}
        };

        if (query.filters) {
            if (query.filters.search) {
                let regex = new RegExp(query.filters.search, "i");
                $match.$or = [
                    { displayname : regex },
                    { email : regex },
                    { username : regex }
                ];
            }
        }
        
        db.join(config.default(), 'entities', [
            { $match }, 
            { $lookup : BADGE_LOOKUP }, 
            { $project : LIST_PROJECTION },
            { $sort : { badgecount : -1 } }
        ], (items) => {
            let assoc = {};
            for (let i = 0; i < items.length; i++) {
                assoc[items[i]._id] = items[i];

                items[i].articles = 0;
                items[i].personality = personalities[items[i].personality || "none"];

                let badges = [];
                for (let j = 0; j < items[i].badges.length; j++) {
                    let b = items[i].badges[j];
                    let bi = ds.DEFAULT_BADGES_ASSOC[b.slug];
                    badges.push({
                        classes : "fa " + bi.icon + " level-" + b.level,
                        displayname : bi.displayname,
                        reason : bi.reason.replace("<n>", bi.levels[b.level]),
                        title : ds.BADGE_LEVEL_TEXT[b.level],
                        level : b.level
                    });
                }

                items[i].badges = badges;
            }

            let siteIndex = -1;
            let sites = config.getAllSites();
            let nextSite = () => {
                if (++siteIndex != sites.length) {
                    db.join(sites[siteIndex], 'content', [
                        { $match : { status : "published" } },
                        { $project : { author : 1} },
                        { $group : { _id : "$author", articles : { $sum : 1 } } }
                    ], (counts) => {
                        for (let i = 0; i < counts.length; i++) {
                            let obj = assoc[counts[i]._id];
                            if (obj) {
                                if (obj.articles) {
                                    obj.articles += counts[i].articles;
                                } else {
                                    obj.articles = counts[i].articles;
                                }
                            }
                        }

                        nextSite();
                    });
                } else {
                    send({ 
                        badges : ds.DEFAULT_BADGES_ASSOC, 
                        levels : ds.BADGE_LEVEL_TEXT,
                        huespin : ds.HUE_SPIN, 

                        items 
                    });
                }
            };

            nextSite();
        });
    }

    livevar(cli, levels, params, send) {
        let lvl = levels[0];
        switch (lvl) {
            case "bunch":
                this.getCrewList(params, send);
                break;

            default:
                send("No top level live variable available for 'crew'");
        }
    }

    setup() {

    }

    form() {

    }
}

const crew = new Crew();
module.exports = crew;
