const db = require('./db.js');
const filelogic = require('../pipeline/filelogic');
const config = require('./config');
const entities = require('../lib/entities.js');

const BADGE_LOOKUP  = { from : "decorations", localField : "_id", foreignField : "entity", as : "badges" };
const SOCIAL_NETWORKS = entities.getSocialNetworks();
const LIST_PROJECTION = { 
    displayname : 1, badges : 1, 
    avatarURL : 1, description : 1,
    personality : 1, socialnetworks : 1,
    badgecount : { "$size": "$badges" },
    firstname : 1, lastname : 1,
    jobtitle : 1, phone : 1, email : 1,
    enforce2fa: 1, confirmed2fa: 1,
    username : 1
};

class Crew {
    constructor() {

    }

    injectMemberFeaturedPosts(member, done) {
        let siteIndex = -1;
        let sites = config.getAllSites();
        member.featuredposts = [];
        
        let nextSite = () => {
            if (++siteIndex == sites.length) {
                member.featuredposts.sort((a, b) => { return b.shares - a.shares });
                return done(member);
            }

            db.join(sites[siteIndex], 'content', [
                { $match : { status : "published", author : member._id } },
                { $sort : { shares : -1 } },
                { $limit : 3 },
                { $lookup : {
                    from : "uploads",
                    as : "featuredimage",
                    localField : "media",
                    foreignField : "_id"
                }},
                { $unwind : "$featuredimage" },
                { $project : { title : 1, subtitle : 1, shares : 1, media : "$featuredimage.sizes.thumbnaillarge.url", date : 1, publicnote : 1 }}
            ], posts => {
                posts.forEach(x => x.site = sites[siteIndex].website.sitetitle);
                member.featuredposts.push(...posts);
                nextSite();
            });
        };

        nextSite();
    }

    getCrewMember(id, send) {
        const instagram = require('./instagram.js');

        const finish = (user) => {
            send(user);
        };

        this.getCrewList({
            _id : id
        }, (user) => {
            user = user.items.pop();

            return finish(user);
            
            this.injectMemberFeaturedPosts(user, () => {
                if (user.socialnetworks && user.socialnetworks.find(x => x.network == "instagram")) {
                    instagram.getSingleAccountStats(user.socialnetworks.find(x => x.network == "instagram").link, (data) => {
                        if (data && data.user) {
                            user.instagram = {
                                username : data.user.username,
                                followers : data.user.followed_by.count,
                                url : "https://www.instagram.com/" + data.user.username,
                                bio : data.user.biography,
                                totalphotos : data.user.media.count,
                                photos : []
                            };

                            data.user.media.nodes.forEach(x => {
                                user.instagram.photos.push({
                                    src : x.thumbnail_src,
                                    likes : x.likes.count,
                                    caption : x.caption
                                });
                            });
                        }

                        finish(user);
                    });
                } else {
                    finish(user);
                }
            });
        });
    }

    getCrewList(query = {}, send) {
        const ds = require('./badges.js').getDecorationSettings();
        const personalities = entities.getPersonalities();
        let $match = {
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

        if (query._id) {
            $match = {_id : query._id};
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
                items[i].shares = 0;
                items[i].personality = personalities[items[i].personality || "none"];

                let networks = [];
                if (items[i].socialnetworks) {
                    for (let n in items[i].socialnetworks) {
                        networks.push({
                            network : n,

                            username: items[i].socialnetworks[n],
                            link : (SOCIAL_NETWORKS[n].url + items[i].socialnetworks[n]),
                            color : (SOCIAL_NETWORKS[n].color),
                            border : (SOCIAL_NETWORKS[n].border),
                            icon : (SOCIAL_NETWORKS[n].icon)
                        });
                    }
                }

                items[i].socialnetworks = networks;

                let badges = [];
                for (let j = 0; j < items[i].badges.length; j++) {
                    let b = items[i].badges[j];
                    let bi = ds.DEFAULT_BADGES_ASSOC[b.slug];
                    badges.push({
                        classes : "fa " + bi.icon + " level-" + b.level,
                        displayname : bi.displayname,
                        reason : bi.reason.replace("<n>", bi.levels[b.level]),
                        title : ds.BADGE_LEVEL_TEXT[b.level],
                        level : b.level,
                        on : b.on
                    });
                }

                items[i].badges = badges.sort((a, b) => { return b.level - a.level; });
            }

            let siteIndex = -1;
            let sites = config.getAllSites();
            let nextSite = () => {
                if (++siteIndex != sites.length) {
                    db.join(sites[siteIndex], 'content', [
                        { $match : { status : "published" } },
                        { $project : { author : 1, shares : 1 } },
                        { $group : { _id : "$author", articles : { $sum : 1 }, fbshares : { $sum : "$shares" } } }
                    ], (counts) => {
                        for (let i = 0; i < counts.length; i++) {
                            let obj = assoc[counts[i]._id];
                            if (obj) {
                                obj.articles += counts[i].articles;
                                obj.shares += counts[i].fbshares;
                            }
                        }

                        nextSite();
                    });
                } else {
                    send({ badges : ds.DEFAULT_BADGES_ASSOC, levels : ds.BADGE_LEVEL_TEXT, huespin : ds.HUE_SPIN, items });
                }
            };

            nextSite();
        });
    }
}

const crew = new Crew();
module.exports = crew;
