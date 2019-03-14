const db = require('./db.js');
const hooks = require('./hooks');
const filelogic = require('../pipeline/filelogic');
const articleLib = require('./content.js');

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

class ContentChainsLib {
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
            editions : [],
        }, data);
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

    insertNewChain(_c, data, callback) {
        let newChain = this.createFromObject(data);
        db.insert(_c, 'contentchains', newChain, (err, r) => {
            hooks.fireSite("content_chain_created");
            callback && callback(err, r);
        });
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

        if (data.editions) {
            data.editions = data.editions.map(x => db.mongoID(x));
        }

        if (data.serie) {
            data.serie = data.serie.map(x => db.mongoID(x));
        }

        db.update(_c, 'contentchains', {_id : db.mongoID(id)}, data, (err, r) => {
            this.deepFetch(_c, { _id : db.mongoID(id) }, chain => {
                hooks.fireSite(_c, "content_chain_updated", chain);
                callback && callback(err);
            });
        });
    }

    deepFetch(_c, $match, send, projection) {
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
                    localField : "editions"
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
            { $project : projection || CHAIN_DEEP_PROJECTION }
        ], items => {
            send(items[0]);
        });
    }

    getChains(cli, params, cb) {
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
        }, {
            $lookup : {
                from : "editions",
                as : "alleditions",
                foreignField : "_id",
                localField : "editions"
            }
    }], chains => {
            if (chains && chains.length) {
                db.count(cli._c, 'contentchains', query, (err, total) => {
                    cb({ chains, total });
                });
            } else {
                cb({ chains: [], total: 0 });
            }
        });
    }
}

module.exports = new ContentChainsLib();

