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
            media : undefined,
            topic : undefined
        }, data);
    }

    insertNewChain(_c, data, callback) {
        let newChain = this.createFromObject(data);
        db.insert(_c, 'contentchains', newChain, callback || noop);
    }

    deepFetch(_c, chainid) {
        
    }

    livevar(cli, levels, params, send) {

    }

    adminGET(cli) {
        filelogic.serveAdminLML(cli);
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

    }
}

const cc = new ContentChains();
module.exports = cc;
