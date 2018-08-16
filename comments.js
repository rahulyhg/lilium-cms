const db = require('./includes/db');

const LIVEVAR_COMMENT_BATCHSIZE = 50;
const COMMENT_TO_ARTICLE_LOOKUP = {
    from : "content",
    as : "post",
    localField : "postid",
    foreignField : "_id"
};

const COMMENT_LATEST_LIST_PROJECTION = {
    date : 1, text : 1, replies : 1, "post.title" : 1, 
};

class LiliumComments {
    adminPOST(cli) {
        
    }  

    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight("editor")) {
            return sendback([]);
        }

        if (levels[0] == "latest") {
            const filters = params.filters || {};
            const $skip = filters.skip || 0;
            const $sort = { _id : -1 };
            const $match = {};
            
            db.aggregate(cli._c, 'fbcomments', [
                { $match },
                { $sort },
                { $skip },
                { $limit : LIVEVAR_COMMENT_BATCHSIZE },
                { $lookup : COMMENT_TO_ARTICLE_LOOKUP },
                { $unwind : "$post" },
                { $project : COMMENT_LATEST_LIST_PROJECTION }
            ], arr => {
                sendback({ items : arr });
            })
        } else if (levels[0] == "posts") {
            cli.throwHTTP(503);
        } else {
            sendback("[LiveVariableException] Cannot use top level livevar");
        }
    }

    // Unauthenticated GET /comments
    GET(cli) {
        const _id = db.mongoID(cli.routeinfo.path[1]);
        if (!_id) {
            return cli.throwHTTP(403);
        }

        db.join(cli._c, 'fbcomments', [
            { $match : { postid : _id, thread : true } }
        ], arr => {
            cli.sendJSON({
                comments : arr
            })
        });
    }
}

module.exports = new LiliumComments();