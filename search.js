
const db = require('./includes/db.js');
const config = require('./config.js');
const hooks = require('./hooks');

const PROJECTION = {
    title : 1, subtitle : 1, media : 1, editions : 1, status : 1, date : 1, author : 1, _id : 1 
};

const LYS_PROJECTION_CONTENT = {
    headline : { $arrayElemAt : ["$title", 0] },
    type : "article"
}

const LYS_PROJECTION_ENTITY = {
    displayname : 1,
    type : "entity"
}

const IMAGE_LOOKUP = {
    from         : "uploads",
    localField   : "media",
    foreignField : "_id",
    as           : "featuredimage"
};

const ARTICLE_LOOKUP = {
    from : "content",
    localField : "clickthrough",
    foreignField : "_id",
    as : "article"
};

const SELECTOR = (words) => {
    return {
        status : {$ne : "destroyed"},
        $text : { $search : words }
    };
}

const REPORT_DEFAULT = (overrides) => {
    return Object.assign({
        // Default site is main site
        siteid : config.default().id,

        // Maximum number of rows returned
        max : 100,

        // 31 days ago
        oldest : Date.now() - (1000 * 60 * 60 * 24 * 31),

        // Now
        newest : Date.now(),

        // Group rows by terms used
        grouped : false,

        // Return a list of clicked articles
        groupGetContent : false,

        // Only match queries with the following term (it's a regex)
        wordmatch : "",

        // Only match queries which resulted in a click, or those which returned an empty set
        onlyclicked : false, onlyemptysets : false
    }, overrides);
};

class ContentSearch {
    generateReport(rawparams = {}, send) {
        const params = REPORT_DEFAULT(rawparams);
        const $match = {};
        
        if (params.oldest != -1) { $match.at = {$gt : params.oldest}; }
        if (params.newest != -1) { $match.at = {$lt : params.newest}; }

        if (params.onlyclicked) { query.clickthrough = {$exists : 1, $ne : false}; }
        else if (params.onlyemptysets) { query.clickthrough = false; }

        if (params.wordmatch) { query.terms = {$regex : new RegExp(params.wordmatch)} }

        db.rawCollection(params.siteid, 'searches', (err, col) => {
            if (params.grouped) {
                col.aggregate([
                    { $match },
                    { $group : { _id : "$terms", repeated : {$sum : 1}, times : {$push : "$at"}, results : {$push : "$clickthrough"} } },
                    { $sort : {repeated : -1} },
                    { $limit : params.max }
                ]).toArray((err, arr) => {
                    if (params.groupGetContent) {
                        let index = -1;
                        const next = () => {
                            if (++index == arr.length) {
                                send(arr);
                            } else {
                                db.findToArray(params.siteid, 'content', {_id : {$in : arr[index].results}}, (err, posts) => {
                                    arr[index].articles = posts;
                                    next();
                                }, {title : 1, name : 1});
                            }
                        };

                        next();
                    } else {
                        send(arr);
                    }
                }); 
            } else {
                col.aggregate([
                    { $match },
                    { $limit : params.max },
                    { $sort : { _id : -1 } },
                    { $lookup : ARTICLE_LOOKUP }
                ]).toArray((err, arr) => {
                    arr.forEach(x => { x.article = x.article.length == 0 ? undefined : x.article[0].title; })

                    send(arr);
                });
            }
        });     
    }

    // TOPIC PARAM DEPRECATED
    queryList(_c, topic, terms, options, send) {
        const max = options.max || 50;
        const page = options.page || 0;
        const conditions = Object.assign({ status : "published", $text : { $search : terms.split(' ').map(x => "\"" + x + "\"").join(' ') } }, options.conditions || {});

        hooks.fireSite(_c, 'search_willFind', {conditions, terms});
        db.join(_c, 'content', [
            {$match : conditions},
            options.scoresort ? {$sort: { score: { $meta: "textScore" }, _id : -1} } : {$sort : {_id : -1}},
            {$skip : page * max},
            {$limit : max},
            {$project : options.projection || PROJECTION},
            {$lookup : EDITION_LOOKUP},
            {$lookup : IMAGE_LOOKUP}
        ], (arr) => {
            arr.forEach && arr.forEach(x => {
                x.featuredimage = x.featuredimage.pop();
                x.editionurl = x.editions.reduce((acc, cur) => cur + "/" + acc);
                x.editionname = x.editions[x.editions.length - 1].displayname;

                if (x.featuredimage) {
                    x.imageurl = x.featuredimage.sizes.thumbnaillarge.url;
                }
            });
            send(arr);
        });
    }

    lysSearch(cli, text, send) {
        const conditions = {
            $and : [
                { $text : { $search : text } },
                { title : { $regex : new RegExp(text, 'i') } }
            ]
        };

        if (!cli.hasRight('editor')) {
            conditions.$and.shift({ author : db.mongoID(cli.userinfo.userid) });
        }

        db.join(cli._c, 'content', [
            { $match : conditions },
            { $sort : {_id : -1} },
            { $limit : 20 },
            { $project : LYS_PROJECTION_CONTENT }
        ], articles => {
            if (cli.hasRight('manage-entities')) {
                db.join(config.default(), 'entities', [
                    { $match : { displayname : { $regex : new RegExp(text, 'i') }, revoked : { $ne : true } } },
                    { $limit : 20 },
                    { $project : LYS_PROJECTION_ENTITY }
                ], entities => {
                    send({ articles, entities })
                });
            } else {
                send({ articles, entities : [] });
            }
        });
    }

    livevar(cli, levels, params, send) {
        if (levels[0] == "dashboard") {
            this.generateReport({
                siteid : cli._c.id,
                grouped : true,
                groupGetContent : true,
                max : 20,
                oldest : Date.now() - (1000 * 60 * 60 * 24 * 7)
            }, (arr) => {
                send(arr.reverse());                  
            });
        } else if (levels[0] == "lys") {
            this.lysSearch(cli, params.text, res => send(res));
        } else {
            const conditions = {};
            if (!cli.hasRight('editor')) {
                conditions.author = db.mongoID(cli.userdata.userid);
            }

            this.queryList(cli._c, db.mongoID(params.topic), params.q, {
                conditions, 
                max : params.max,
                page : params.page,
                scoresort : params.scoresort
            }, (posts) => {
                send(posts);
            });
        }
    }

    setup() {
    }
}

module.exports = new ContentSearch();
