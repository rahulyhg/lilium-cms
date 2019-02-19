const db = require('../lib/db');

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

const LIVEVAR_BUNCH_LIMIT = 50;

const LIVEVAR_PROJECT = {
    _id : 1, poster : 1, message : 1,
    type : 1, at : 1, from : 1, flaggeetype : 1, status : 1,

    "article._id"           : 1, 
    "article.title"         : { $arrayElemAt : ["$article.title", 0] }, 
    "article.subtitle"      : { $arrayElemAt : ["$article.subtitle", 0] },
    "article.isSponsored"   : 1,
    "article.status"        : 1,
    "article.nsfw"          : 1,
    "article.editions"      : 1,
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
        if (cli.routeinfo.path[2] == "close") {
            if (!cli.routeinfo.path[3]) {
                return cli.throwHTTP(400, null, true);
            }

            const _id = db.mongoID(cli.routeinfo.path[3]);
            db.update(cli._c, 'flags', { _id }, { status : "closed", closedAt : Date.now(), closedBy : db.mongoID(cli.userinfo.userid) }, (err, r) => {
                cli.sendJSON({ ok: r && r.result && r.result.nModified });
            });
        } else {
            cli.throwHTTP(404, null, true);
        }
    }

    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight("moderate")) {
            return sendback([]);
        }

        if (levels[0] == "bunch") {
            const filters = params.filters || {};
            const $skip = params.skip || 0;
            const $sort = { _id : -1 };
            const $match = {};

            if (filters.status) {
                $match.status = filters.status;
            }

            if (filters.search) {
                $match.message = new RegExp(filters.search, 'gi');
            }

            if (filters.type) {
                $match.type = filters.type;
            }

            db.join(cli._c, 'flags', [
                { $match },
                { $sort },
                { $skip },
                { $limit : LIVEVAR_BUNCH_LIMIT },
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
        } else {
            sendback([]);
        }
    }
}

module.exports = new Flagging();
