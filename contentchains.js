const log = require('./log.js');
const db = require('./includes/db.js');
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

    }

    adminPOST(cli) {

    }
}

const cc = new ContentChains();
module.exports = cc;
