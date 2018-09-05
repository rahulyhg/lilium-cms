const db = require('./includes/db');

const LIVEVAR_POSTER_LOOKUP = {
    from : "fbusers",
    as : "poster",
    localField : "poster",
    foreignField : "_id"
}

const LIVEVAR_ARTICLE_LOOKUP = {
    from : "content",
    as : "article",
    localField : "articleid",
    foreignField : "_id"
}

const LIVEVAR_PROJECT = {
    _id : 1, poster : 1, message : 1,
    type : 1, at : 1, from : 1, flaggeetype : 1, status : 1,

    "article._id"           : 1, 
    "article.title"         : { $arrayElemAt : ["$article.title", 0] }, 
    "article.subtitle"      : { $arrayElemAt : ["$article.subtitle", 0] },
    "article.isSponsored"   : 1,
    "article.nsfw"          : 1,
    "article.topicslug"     : 1,
    "article.name"          : 1,
    "article.facebookmedia" : 1,
    "article.author"        : 1,
    "article.date"          : 1
}

class Flagging {
    POST(cli) {
        
    }

    adminPOST(cli) {

    }

    adminPUT(cli) {

    }

    adminDELETE(cli) {

    }

    livevar(cli, levels, params, sendback) {
        db.join(cli._c, 'flags', [
            { $match : { status : "open" } },
            { $lookup : LIVEVAR_POSTER_LOOKUP },
            { $lookup : LIVEVAR_ARTICLE_LOOKUP },
            { $unwind : "$poster" },
            { $unwind : "$article" },
            { $project : LIVEVAR_PROJECT }
        ], arr => {
            sendback({
                items : arr,
                placeholder : true
            });
        })
    }
}

module.exports = new Flagging();