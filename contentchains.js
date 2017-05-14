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
            description : "",
            createdBy : undefined,
            createdOn : new Date(),
            lastModified : new Date(),
            publishedOn : new Date(),
            media : undefined
        }, data);
    }

    insertNewChain(_c, data, callback) {
        let newChain = this.createFromObject(data);
        db.insert(_c, 'contentchains', newChain, callback || noop);
    }

    deepFetch(_c, chainid) {
        
    }

    bunchLivevar(cli, levels, params, send) {
        send([]);
    }

    livevar(cli, levels, params, send) {
        if (levels[0] == "bunch") {
            this.bunchLivevar(...arguments);
        }
    }

    adminGET(cli) {
        var path = cli.routeinfo.path[2];

        if (!path) {
            filelogic.serveAdminLML(cli);
        } else if (path == "edit") {
            
        } else {
            cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {

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
            displayname : "Title",
            placeholder : true,
            classes : ["bigtitle"]
        })
        .add('subtitle', 'text', {
            placeholder: true,
            displayname: 'Subtitle'
        })
        .add('title-content', 'title', {
            displayname : "Content"
        })
        .add('contentlist', 'snip', {
            snip : "contentlist",
            livevars : ["content.simple"]
        })
    }

    table(cli) {
        require('./tableBuilder.js').createTable({
            name : "contentchain",
            endpoint: "chains.table",
            paginate : true,
            searchable : true,
            max_results : 25, 
            sortby : '_id',
            sortorder : -1,
            filters : {
                status : {
                    displayname : "status",
                    datasource : [{
                        value : "live",
                        displayname : "Live"
                    }, {
                        value : "draft",
                        displayname : "Draft"
                    }]
                },
                author : {
                    displayname : "Author",
                    livevar : {
                        endpoint : "entities.simple.active",
                        value : "_id",
                        displayname : "displayname"
                    }
                }
            },
            fields : [{
                key : "title",
                displayname : "Title",
                template : "table-chain-title",
                sortable : true,
                sortkey : "title",
                classes : "chain-table-title"
            }]                 
        });
    }
}

const cc = new ContentChains();
module.exports = cc;
