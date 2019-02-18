
const db = require('./includes/db.js');
const config = require('./config.js');
const filelogic = require('./pipeline/filelogic');

const COLLECTION_NAME = "entityrelationship";

class EntityRelationship {
    constructor(doc) {
        if (doc) {
            this.parent = doc.parent;
            this.children = doc.children;
            this.isTop = !doc.parent;
            this.displayname = doc.displayname;

            this.status = doc.status;
            this.deepchildren = doc.deepchildren;
            this.deepparent = doc.deepparent;
        }
    }

    static fromDB(doc) {
        return new EntityRelationship(doc);
    }

    static fromID(relid, send) {
        db.findUnique(config.default(), COLLECTION_NAME, {_id : db.mongoID(relid)}, (err, theone) => {
            send(EntityRelationship.fromDB(relationship));
        });
    }

    static one(parentid, send) {
        db.findUnique(config.default(), COLLECTION_NAME, {parent : db.mongoID(parentid)}, (err, relationship) => {
            send(EntityRelationship.fromDB(relationship));
        });
    }

    static getBunch(params, send) {
        db.findToArray(config.default(), COLLECTION_NAME, {status : {$ne : "deleted"}}, (err, arr) => {
            send( arr.map(x => new EntityRelationship(x)) );
        });
    }

    static deepFetch(selector, send) {
        db.join(config.default(), COLLECTION_NAME, [
            {
                $match : selector
            }, {
                $lookup : {
                    from : "entities",
                    localField : "parent",
                    foreignField : "_id",
                    as : "deepparent"
                }
            }, {
                $lookup : {
                    from : "entities",
                    localField : "children",
                    foreignField : "_id",
                    as : "deepchildren"
                }
            }
        ], (relationships) => {
            send(relationships);
        })
    }
}

class ERModule {
    adminGET(cli) {
        if (!cli.hasRight('entityrelationship')) {
            return cli.throwHTTP(403);
        }

        filelogic.serveAdminLML3(cli);
    }

    adminPOST(cli) {
        cli.throwHTTP(403, undefined, true);
    }

    livevar(cli, levels, params, send) {
        let action = levels[0];
        switch (action) {
            case "deepparent":
                EntityRelationship.deepFetch({parent : levels[1]}, send); 
                break;

            case "deep": 
                EntityRelationship.deepFetch({_id : db.mongoID(levels[1])}, send);
                break;

            case "bunch":
                EntityRelationship.getBunch(params, send);
                break;

            default:
                send("[Entityrelationship - Live Variable endpoint undone]");
        }
    }

    setup(that) {
    }
}

module.exports = new ERModule();
