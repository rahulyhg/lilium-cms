const log = require('./log.js');
const db = require('./includes/db.js');
const filelogic = require('./filelogic.js');
const articleLib = require('./article.js');
const noop = () => {};

class ContentChains {
    constructor() {
        
    }

    createFromObject(data) {
        return Object.assign({
            title : "",
            subtitle : "",
            slug : "",
            presentation : "",
            status : "backstage",
            createdBy : undefined,
            createdOn : new Date(),
            lastModified : new Date(),
            media : undefined,
            serie : []
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
        let chainData = data;
        if (chainData.media) {
            chainData.media = db.mongoID(chainData.media);
        }

        if (chainData.date) {
            chainData.date = new Date(chainData.date);
        } else {
            delete chainData.date;
        }

        let that = this;
        id = db.mongoID(id);
        db.update(_c, 'contentchains', {_id : id}, chainData, () => {
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
                item.media = undefined;
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

        var path = cli.routeinfo.path[2];   

        if (path == "new") {
            this.insertNewChain(cli._c, {
                title : cli.postdata.data.title,
                slug : require('slug')(cli.postdata.data.title).toLowerCase(),
                createdBy : db.mongoID(cli.userinfo.userid)
            }, (err, r) => {
                cli.sendJSON({
                    editurl : cli._c.server.url + "/admin/chains/edit/" + r.insertedId,
                    valid : true
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
            console.log(df.serie);
            articleLib.batchFetch(_c, df.serie.map(x => db.mongoID(x)), articles => {
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

    form(cli) {
        require('./formBuilder.js').createForm("contentchains", {
            formWrapper: {
                'tag': 'div',
                'class': 'row',
                'id': 'contentchainwrapper',
                'inner': true
            },
            fieldWrapper : "lmlform-fieldwrapper"
        })
        .add('title', 'text', {
            displayname : "Headline",
            placeholder : true,
            classes : ["bigtitle"]
        })
        .add('subtitle', 'text', {
            placeholder: true,
            displayname: 'Subtitle'
        })
        .add('title-content', 'title', {
            displayname : "Serie"
        })
        .add('contentlist', 'snip', {
            snip : "contentlist",
            livevars : ["content.simple"]
        })
        .add('title-presentation', 'title', {
            displayname : "Presentation"
        })
        .add('presentation', 'ckeditor', {
            nolabel : true
        })
        .add('media', 'media-explorer', {
            displayname : "Featured image",
            classes : "content-chain-media-picker"
        })
        .add('title-complete', 'title', {
            displayname : "Chain completion"
        })
        .add('finished', 'checkbox', {
            displayname : "This chain is complete"
        })
        .add('pendingtext', 'text', {
            displayname : "Display text for upcoming article if not complete"
        }, {
            required : false
        })
        .add('title-details', 'title', {
            displayname : "Details"
        })
        .add('date', 'date', {
            displayname : "Live date",
            datetime : true,
            context : 'edit'
        }, {
            required : false
        })
        .add('slug', 'text', {
            displayname : "URL slug"
        }, {
            required : false   
        })
        .add('title-actions', 'title', {
            displayname : "Actions"
        })
        .add('publish-set', 'buttonset', { 
            buttons : [
                {
                    name : 'save',
                    displayname: 'Save changes',
                    type : 'button',
                    classes: ['btn-save']
                }, {
                    name : "golive",
                    displayname : "Save and go Live",
                    type : "button",
                    classes : ["btn-publish", "green"]
                }, {
                    name : "backstage",
                    displayname : "Backstage",
                    type : "button",
                    classes : ["btn-remove"]
                }
            ]
        });
    }
}

const cc = new ContentChains();
module.exports = cc;
