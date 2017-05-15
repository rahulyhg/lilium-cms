const log = require('./log.js');
const db = require('./includes/db.js');
const filelogic = require('./filelogic.js');
const noop = () => {};

class ContentChains {
    constructor() {
        
    }

    createFromObject(data) {
        return Object.assign({
            title : "",
            subtitle : "",
            presentation : "",
            status : "draft",
            createdBy : undefined,
            createdOn : new Date(),
            lastModified : new Date(),
            publishedOn : new Date(),
            media : undefined
        }, data);
    }

    insertNewChain(_c, data, callback) {
        let newChain = this.createFromObject(data);
        db.insert(_c, 'contentchains', newChain, callback);
    }

    deepFetch(_c, chainid, send) {
        db.findUnique(_c, 'contentchains', {_id : db.mongoID(chainid)}, (err, item) => {
            send(item);
        });
    }

    bunchLivevar(cli, levels, params, send) {
        send([]);
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
                createdBy : db.mongoID(cli.userinfo.userid)
            }, (err, r) => {
                cli.sendJSON({
                    editurl : cli._c.server.url + "/admin/chains/edit/" + r.insertedId,
                    valid : true
                });
            });
        } else if (path == "edit") {
            
        } else {
            cli.throwHTTP(404, undefined, true);
        }
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
        .add('title-details', 'title', {
            displayname : "Details"
        })
        .add('publish-set', 'buttonset', { buttons : [{
                'name' : 'save',
                'displayname': 'Save changes',
                'type' : 'button',
                'classes': ['btn-save']
            }
        ]});
    }

    table(cli) {
    }
}

const cc = new ContentChains();
module.exports = cc;
