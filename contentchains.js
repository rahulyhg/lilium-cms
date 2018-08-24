const log = require('./log.js');
const db = require('./includes/db.js');
const filelogic = require('./filelogic.js');
const articleLib = require('./article.js');
const noop = () => {};

const CONTENTCHAIN_LIVEVAR_PROJECTION = {
    title : 1,
    subtitle : 1,
    slug : 1,
    presentation : 1,
    status : 1,
    createdBy : 1,
    createdOn : 1,
    lastModified : 1,
    featuredMedia: 1,
    'articles._id': 1,
    'articles.title': 1,
    'articles.date': 1
}

class ContentChains {
    constructor() {
        
    }

    createFromObject(data) {
        return Object.assign({
            title : "",
            subtitle : "",
            slug : "",
            presentation : "",
            status : "draft",
            createdBy : undefined,
            createdOn : new Date(),
            lastModified : new Date(),
            featuredMedia: undefined,
            articles : []
        }, data);
    }

    insertNewChain(_c, data, callback) {
        let newChain = this.createFromObject(data);
        db.insert(_c, 'contentchains', newChain, callback);
    }

    handleStatusChange(_c, id, callback) {
        this.deepFetch(_c, id, cc => {
            
        });
    }

    editChain(_c, id, data, callback) {
        if (data.featuredMedia) {
            data.featuredMedia = db.mongoID(data.featuredMedia);
        }

        if (data.date) {
            data.date = new Date(data.date);
        } else {
            delete data.date;
        }

        db.update(_c, 'contentchains', {_id : db.mongoID(id)}, data, () => {
            callback && callback();
        });
    }

    deepFetch(_c, chainid, send) {
        db.join(_c, 'contentchains', [ 
            { 
                $match : { _id : db.mongoID(chainid) }
            }, { 
                $limit : 1
            }, {
                $lookup : {
                    from : "uploads",
                    localField : "media",
                    foreignField : "_id",
                    as : "featuredimage"
                }
            }
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
                as : "featuredimage"
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

    livevar(cli, levels, params, send) {
        if (!cli.hasRight('editor')) {
            return send();
        }

        if (levels[0] == "bunch") {
            this.bunchLivevar(...arguments);
        } else if (levels[0] == "deep") {
            this.deepFetch(cli._c, levels[1], (item) => {
                send(item);
            });
        } else if (levels[0] == "search") {
            db.join(cli._c, 'content', [
                { $match: { title: { $regex: new RegExp(params.query, 'i') }}},
                { $limit: 30 },
                { $project: { title: { $arrayElemAt: ['$title', 0] }, date: 1 }},
            ], items => {
                send(items);
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
                },
                { $project: CONTENTCHAIN_LIVEVAR_PROJECTION }
            ], items => {
                if (items) {
                    items[0].articles.forEach(article => { article.title = article.title[0] } );
                    send(items[0]);
                } else {
                    send();
                }
            });
        }
    }

    adminGET(cli) {
        if (!cli.hasRight('editor')) {
            return cli.refuse();
        }

        var path = cli.routeinfo.path[2];

        if (!path || path == "new") {
            filelogic.serveAdminLML(cli);
        } else if (path == "edit") {
            filelogic.serveAdminLML(cli, true);
        } else {
            cli.throwHTTP(404);
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
            this.editChain(cli._c, cli.routeinfo.path[3], cli.postdata.data, (error) => {
                cli.sendJSON({
                    message : "Content chain saved",
                    success : !error,
                    error 
                });
            });
        } else if (path == "live") {
            let updatedData = cli.postdata.data;
            updatedData.status = "live";

            this.editChain(cli._c, cli.routeinfo.path[3], updatedData, (error) => {
                cli.sendJSON({
                    title : "Sit tight!",
                    message : "Content chain was saved successfully, and Lilium is currently generating everything.",
                    success : !error,
                    error 
                });

                this.generateChain(cli._c, cli.routeinfo.path[3], (error) => {
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    generateChain(_c, strID, callback) {
        this.deepFetch(_c, strID, df => {
            console.log(df.articles);
            articleLib.batchFetch(_c, df.articles.map(x => db.mongoID(x)), articles => {
                let id = df._id;
                let extra = {
                    config : _c,
                    chain : df,
                    articles : articles
                };

                let landingPath = _c.server.html + "/" + df.slug + ".html";
                filelogic.renderThemeLML(_c, 'chain', landingPath, extra, callback);
            });
        });
    }
}

const cc = new ContentChains();

module.exports = cc;
