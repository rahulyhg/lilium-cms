const log = require('./log.js');
const db = require('./includes/db.js');
const config = require('./config.js');

const PROJECTION = {
    title : 1, subtitle : 1, media : 1, topic : 1, status : 1, date : 1, author : 1, _id : 1 
};

const IMAGE_LOOKUP = {
    from         : "uploads",
    localField   : "media",
    foreignField : "_id",
    as           : "featuredimage"
};

const TOPIC_LOOKUP = {
    from         : "topics",
    localField   : "topic",
    foreignField : "_id",
    as           : "deeptopic"
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

        // Only match queries with the following term (it's a regex)
        wordmatch : ""
    }, overrides);
};

class ContentSearch {
    generateReport(rawparams = {}, send) {
        const params = REPORT_DEFAULT(rawparams);
        const $match = {};
        
        if (params.oldest) { $match.at = {$lt : params.oldest}; }
        if (params.newest) { $match.at = {$gt : params.newest}; }
        if (params.wordmatch) { query.terms = {$regex : new RegExp(params.wordmatch)} }

        db.rawCollection(params.siteid, 'searches', (err, col) => {
            if (params.grouped) {
                col.aggregate([
                    { $match },
                    { $group : { _id : "$terms", repeated : {$sum : 1}, times : {$push : "$at"} } },
                    { $sort : {repeated : -1} },
                    { $limit : params.max }
                ]).toArray((err, arr) => {
                    send(arr);
                }); 
            } else {
                col.find($match).limit(params.max).sort({_id : -1}).toArray((err, arr) => {
                    send(arr);
                });
            }
        });     
    }

    queryList(_c, topic, terms, options, send) {
        const max = options.max || 50;
        const page = options.page || 0;
        const conditions = Object.assign(SELECTOR(terms), options.conditions || {});

        db.findToArray(_c, 'topics', { family : topic || "willnotresolve" }, (err, topics) => {
            if (topics.length) {
                conditions.topic = {$in : topics.map(x => x._id)};
            }

            db.join(_c, 'content', [
                {$match : conditions},
                options.scoresort ? {$sort: { score: { $meta: "textScore" }, _id : -1} } : {$sort : {_id : -1}},
                {$skip : page * max},
                {$limit : max},
                {$project : options.projection || PROJECTION},
                {$lookup : TOPIC_LOOKUP},
                {$lookup : IMAGE_LOOKUP}
            ], (arr) => {
                arr.forEach && arr.forEach(x => {
                    x.featuredimage = x.featuredimage.pop();
                    x.topic = x.deeptopic.pop();
                    x.deeptopic = undefined;

                    if (x.topic) { 
                        x.topicname = x.topic.displayname;
                        x.topicurl = _c.server.url + "/" + x.topic.completeSlug;
                    }

                    if (x.featuredimage) {
                        x.imageurl = x.featuredimage.sizes.thumbnaillarge.url;
                    }
                });
                send(arr);
            });
        }, {_id : 1});
    }

    livevar(cli, levels, params, send) {
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

            db.insert(cli._c, 'searches', {
                from : "backend",
                by : db.mongoID(cli.userinfo.userid),
                terms : params.q,
                at : Date.now()
            }, () => {});
        });
    }
}

module.exports = new ContentSearch();
