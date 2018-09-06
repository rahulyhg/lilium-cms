const db = require('./includes/db');

const LIVEVAR_COMMENT_BATCHSIZE = 50;
const COMMENT_TO_ARTICLE_LOOKUP = {
    from : "content",
    as : "post",
    localField : "postid",
    foreignField : "_id"
};

const COMMENT_TO_USER_LOOKUP = {
    from : 'fbusers',
    as : 'commenter',
    localField : 'author',
    foreignField : '_id'
};

const COMMENT_TO_REPLIES = {
    from : 'fbreplies', 
    as : "replies",
    localField : "_id",
    foreignField : "threadid"
};

const COMMENT_REPLY_TO_AUTHOR = {
    from : "fbusers",
    as : "commenters",
    localField : "replies.author",
    foreignField : "_id"
};

const COMMENT_LATEST_LIST_PROJECTION = {
    date : 1, text : 1, replies : 1, deletedText : 1, active : 1,
    headline : { "$arrayElemAt" : ["$post.title", 0] }, 
    articleid : "$post._id",
    "commenter._id" : 1,
    "commenter.displayname" : 1
};

const THREAD_WITH_REPLIES_PROJECTION = {
    date : 1, text : 1, deletedText : 1, active : 1,
    headline : { "$arrayElemAt" : ["$post.title", 0] }, 
    articleid : "$post._id",
    featuredimage : "$post.facebookmedia",
    replies : 1,
    commenter : 1,
    commenters : 1
}

class LiliumComments {
    adminPOST(cli) {
        
    }  

    adminDELETE(cli) {
        if (cli.hasRightOrRefuse("moderate")) {
            if (cli.routeinfo.path[2] == "thread") {
                const _id = db.mongoID(cli.routeinfo.path[3]);
                db.findUnique(cli._c, 'fbcomments', { _id, active : true }, (err, comment) => {
                    if (comment) {
                        db.update(cli._c, 'fbcomments', { _id }, {
                            active : false,
                            text : "---",
                            deletedText : comment.text
                        }, (err, r) => {
                            cli.sendJSON(r);
                        })
                    } else {
                        cli.throwHTTP(404, undefined, true);
                    }
                });
            } else if (cli.routeinfo.path[2] == "reply") {
                const _id = db.mongoID(cli.routeinfo.path[3]);
                db.findUnique(cli._c, 'fbreplies', { _id, active : true }, (err, comment) => {
                    if (comment) {
                        db.update(cli._c, 'fbreplies', { _id }, {
                            active : false,
                            text : "---",
                            deletedText : comment.text
                        }, (err, r) => {
                            cli.sendJSON(r);
                        })
                    } else {
                        cli.throwHTTP(404, undefined, true);
                    }
                });
            }
        }
    }

    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight("moderate")) {
            return sendback([]);
        }

        if (levels[0] == "latest") {
            const filters = params.filters || {};
            const $skip = filters.skip || 0;
            const $sort = { _id : -1 };
            const $match = { active : true };

            if (filters.status == "deleted") {
                $match.active = false;
            }

            if (filters.search && filters.search.trim().length > 2) {
                $match.text = new RegExp(filters.search, 'i');
            }
            
            db.aggregate(cli._c, 'fbcomments', [
                { $match },
                { $sort },
                { $skip },
                { $limit : LIVEVAR_COMMENT_BATCHSIZE },
                { $lookup : COMMENT_TO_ARTICLE_LOOKUP },
                { $lookup : COMMENT_TO_USER_LOOKUP },
                { $unwind : "$post" },
                { $unwind : "$commenter" },
                { $project : COMMENT_LATEST_LIST_PROJECTION }
            ], arr => {
                sendback({ items : arr });
            })
        } else if (levels[0] == "thread") {
            const _id = db.mongoID(levels[1]);
            db.join(cli._c, 'fbcomments', [
                { $match : { _id } },
                { $limit : 1 },
                { $lookup : COMMENT_TO_USER_LOOKUP },
                { $lookup : COMMENT_TO_ARTICLE_LOOKUP },
                { $unwind : "$commenter" },
                { $unwind : "$post" },
                { $lookup : COMMENT_TO_REPLIES },
                { $lookup : COMMENT_REPLY_TO_AUTHOR },
                { $project : THREAD_WITH_REPLIES_PROJECTION }
            ], thread => {
                sendback(thread && thread[0]);
            });
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