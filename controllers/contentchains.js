const db = require('../lib/db.js');
const filelogic = require('../pipeline/filelogic');
const articleLib = require('../lib/content.js');
const cclib = require('../lib/contentchains');

const CONTENTCHAIN_LIVEVAR_PROJECTION = {
    title : 1,
    subtitle : 1,
    slug : 1,
    presentation : 1,
    status : 1,
    createdBy : 1,
    createdOn : 1,
    lastModified : 1,
    language : 1,
    edition : 1,
    media: { $arrayElemAt: ['$media', 0] },
    
    'articles._id': 1,
    'articles.title': 1,
    'articles.date': 1
};

class ContentChains {
    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight('editor')) {
            return sendback();
        }

        if (levels[0] == "bunch") {
            cclib.bunchLivevar(...arguments);
        } else if (levels[0] == "deep") {
            cclib.deepFetch(cli._c, { _id : db.mongoID(levels[1]) }, (item) => {
                sendback(item);
            });
        } else if (levels[0] == "search") {
            const $match = {};

            if (params.filters.search) {
                $match.title = new RegExp(params.filters.search, 'i');
            }

            if (params.filters.status) {
                $match.status = params.filters.status;
            }

            db.join(cli._c, 'contentchains', [
                { $match },
                { $sort : {_id : -1} },
                { $skip : params.filters.skip || 0 },
                { $limit : params.filters.limit || 30 },
                {
                    $lookup : {
                        from : "content",
                        localField : "articles",
                        foreignField : "_id",
                        as : "articles" }
                }, {
                    $lookup : {
                        from : "uploads",
                        localField : "media",
                        foreignField : "_id",
                        as : "media" }
                }, { $project: CONTENTCHAIN_LIVEVAR_PROJECTION }
            ], (items) => {
                if (items.length) {
                    items[0].articles.forEach(article => { article.title = article.title[0] } );
                    sendback({ items });
                } else {
                    sendback({ items: [] });
                }
            });
        } else if (levels[0] == "searchContent") {
            db.join(cli._c, 'content', [
                { $match: { title: { $regex: new RegExp(params.query, 'i') }}},
                { $limit: 30 },
                { $project: { title: { $arrayElemAt: ['$title', 0] }, date: 1 }},
            ], items => {
                sendback(items);
            });
        } else {
            db.join(cli._c, 'contentchains', [
                { $match : { _id: db.mongoID(levels[0]) } },
                {
                    $lookup : {
                        from : "content",
                        localField : "articles",
                        foreignField : "_id",
                        as : "articles" }
                }, {
                    $lookup : {
                        from : "uploads",
                        localField : "media",
                        foreignField : "_id",
                        as : "media" }
                }, { $project: CONTENTCHAIN_LIVEVAR_PROJECTION }
            ], items => {
                if (items.length) {
                    items[0].articles.forEach(article => { article.title = article.title[0] } );
                    sendback(items[0]);
                } else {
                    cli.throwHTTP(404, 'Content chain not found', true);
                }
            });
        }
    }

    adminPOST(cli) {
        if (!cli.hasRight('editor')) {
            return cli.refuse();
        }

        let path = cli.routeinfo.path[2];   

        if (path == "new") {
            cclib.insertNewChain(cli._c, {
                title : cli.postdata.data.title,
                subtitle : cli.postdata.data.subtitle,                
                createdBy : db.mongoID(cli.userinfo.userid)
            }, (err, r) => {
                cli.sendJSON({
                    created: r.ops[0],
                    valid: !err
                });
            });
        } else if (path == "edit") {
            cclib.editChain(cli._c, cli.routeinfo.path[3], cli.postdata.data, error => {
                cli.sendJSON({
                    message : "Content chain saved",
                    success : !error,
                    error
                });
            });
        } else if (path == "updateArticles") {
            const mappedArticles = cli.postdata.data.map(article => db.mongoID(article));
            
            cclib.editChain(cli._c, cli.routeinfo.path[3], { articles: mappedArticles }, error => {
                cli.sendJSON({
                    message : "Content chain saved",
                    success : !error,
                    error
                });
            });
        } else if (path == "live") {
            let updatedData = cli.postdata.data;

            db.findUnique(cli._c, 'contentchains', { _id : db.mongoID(cli.routeinfo.path[3]) }, (err, chain) => {
                if (!chain) {
                    return cli.throwHTTP(404, 'Content chain not found', true);
                }

                updatedData.status = "live";
                updatedData.slug = require('slug')(chain.title).toLowerCase();

                cclib.editChain(cli._c, cli.routeinfo.path[3], updatedData, error => {
                    cli.sendJSON({ success: true });

                    cclib.generateChain(cli._c, cli.routeinfo.path[3], (error) => {

                    });
                });
            });
        } else if (path == "addpost") {
            let chainid = cli.routeinfo.path[3];
            let postid = cli.routeinfo.path[4];

            db.findUnique(cli._c, 'contentchains', { _id : db.mongoID(chainid) }, (err, chain) => {
                if (chain && postid) {
                    if (chain.articles && chain.articles.map(x => x.toString()).includes(postid)) {
                        cli.throwHTTP(409, undefined, true);
                    } else {
                        db.update(cli._c, 'contentchains', { _id : db.mongoID(chainid) }, {
                            $addToSet : { articles : db.mongoID(postid) }
                        }, () => {
                            cli.sendJSON({ added : postid, to : chainid });
                        }, false, true, true)
                    }
                } else {
                    cli.throwHTTP(404, undefined, true);
                }
            });
        } else if (path == "unpublish") {
            let updatedData = cli.postdata.data;
            updatedData.status = "draft";

            cclib.editChain(cli._c, cli.routeinfo.path[3], updatedData, error => {
                cli.sendJSON({ success: true });

                cclib.generateChain(cli._c, cli.routeinfo.path[3], (error) => {
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }
}

const cc = new ContentChains();
module.exports = cc;
