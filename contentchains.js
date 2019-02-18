
const db = require('./lib/db.js');
const filelogic = require('./pipeline/filelogic');
const articleLib = require('./content.js');

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

const CHAIN_DEEP_PROJECTION = {
    title : 1,
    subtitle : 1,
    slug : 1,
    presentation : 1,
    status : 1,
    language : 1,
    lastModified : 1,

    'featuredimage' : '$media.sizes.facebook.url',
    'thumbnail' : '$media.sizes.thumbnaillarge.url',
    'square' : '$media.sizes.thumbnail.url',

    'articles._id': 1,
    'articles.title': 1,
    'articles.subtitle': 1,
    'articles.facebookmedia' : 1,
    'articles.date': 1,

    'alleditions._id' : 1,
    'alleditions.displayname' : 1,
    'alleditions.slug' : 1
};

class ContentChains {
    constructor() {
        
    }

    createFromObject(data) {
        return Object.assign({
            title : "",
            subtitle : "",
            slug : "",
            presentation : "",
            language : 'en',
            status : "draft",
            createdBy : undefined,
            createdOn : new Date(),
            lastModified : new Date(),
            media: undefined,
            edition : [],
            serie : []
        }, data);
    }

    insertNewChain(_c, data, callback) {
        let newChain = this.createFromObject(data);
        db.insert(_c, 'contentchains', newChain, callback);
    }

    handleStatusChange(_c, id, callback) {
        this.deepFetch(_c, { _id : db.mongoID(id) }, cc => {
            
        });
    }

    editChain(_c, id, data, callback) {
        if (data.media) {
            data.media = db.mongoID(data.media);
        }

        if (data.date) {
            data.date = new Date(data.date);
        } else {
            delete data.date;
        }

        if (data.edition) {
            data.edition = data.edition.map(x => db.mongoID(x));
        }

        if (data.serie) {
            data.serie = data.serie.map(x => db.mongoID(x));
        }

        db.update(_c, 'contentchains', {_id : db.mongoID(id)}, data, (err) => {
            callback && callback(err);
        });
    }

    deepFetch(_c, $match, send) {
        db.join(_c, 'contentchains', [ 
            { $match }, 
            { $limit : 1 }, 
            {
                $lookup : {
                    from : "uploads",
                    localField : "media",
                    foreignField : "_id",
                    as : "media"
                }
            }, {
                $lookup : {
                    from : "editions",
                    as : "alleditions",
                    foreignField : "_id",
                    localField : "edition"
                }
            }, {
                $lookup : {
                    from : "content",
                    as : "articles",
                    foreignField : "_id",
                    localField : "articles"
                }
            }, 
            { $unwind : "$media" }, 
            { $project : CHAIN_DEEP_PROJECTION }
        ], (item) => {
            send(item[0]);
        });
    }

    bunchLivevar(cli, levels, params, send) {
        let filters = params.filters || {};
        let page = (params.page || 1) - 1;
        let max = params.max || 25;

        let query = {};

        // Allowed filters
        if (filters.status) {
            query.status = filters.status;
        }

        if (max < 1) {
            max = 25;
        }

        db.join(cli._c, 'contentchains', [{
            $match : query
        }, {
            $sort : {_id : -1}
        }, {
            $skip : ((page < 0 ? 0 : page) * max)
        }, {
            $limit : max
        }, {
            $lookup : {
                from : "uploads",
                localField : "media",
                foreignField : "_id",
                as : "media"
            }
        }], (items) => {
            items.forEach(item => {
                let img = item.featuredimage.pop();
                if (img) {
                    item.featuredimageurl = img.sizes.square.url;
                }

                item.featuredimage = undefined;
                item.featuredMedia = undefined;
            });

            db.count(cli._c, 'contentchains', query, (err, total) => {
                send({ items, total });
            });
        });
    }

    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight('editor')) {
            return sendback();
        }

        if (levels[0] == "bunch") {
            this.bunchLivevar(...arguments);
        } else if (levels[0] == "deep") {
            this.deepFetch(cli._c, { _id : db.mongoID(levels[1]) }, (item) => {
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
            this.insertNewChain(cli._c, {
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
            this.editChain(cli._c, cli.routeinfo.path[3], cli.postdata.data, error => {
                cli.sendJSON({
                    message : "Content chain saved",
                    success : !error,
                    error
                });
            });
        } else if (path == "updateArticles") {
            const mappedArticles = cli.postdata.data.map(article => db.mongoID(article));
            
            this.editChain(cli._c, cli.routeinfo.path[3], { articles: mappedArticles }, error => {
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

                this.editChain(cli._c, cli.routeinfo.path[3], updatedData, error => {
                    cli.sendJSON({ success: true });

                    this.generateChain(cli._c, cli.routeinfo.path[3], (error) => {

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

            this.editChain(cli._c, cli.routeinfo.path[3], updatedData, error => {
                cli.sendJSON({ success: true });

                this.generateChain(cli._c, cli.routeinfo.path[3], (error) => {
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    generateChain(_c, strID, callback) {
        this.deepFetch(_c, { _id : db.mongoID(strID) }, df => {
            articleLib.batchFetch(_c, df.articles.map(x => db.mongoID(x)), articles => {
                let id = df._id;
                let extra = {
                    config : _c,
                    chain : df,
                    articles : articles
                };

                let landingPath = _c.server.html + "/" + df.slug + ".html";
                filelogic.renderThemeLML(_c, 'chain', landingPath, extra, callback);
            }, '_id');
        });
    }
}

const cc = new ContentChains();

module.exports = cc;
