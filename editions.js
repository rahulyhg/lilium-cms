const db = require('./includes/db');

const EDITION_COLLECTION = "editions";
const SECTION_COLLECTION = "sections";

class EditionSection {
    
}

class Edition {
    
}

class EditionController {
    adminPOST(cli) {
        const act = cli.routeinfo.path[2];

        if (act == "merge") {
            // /merge/parent/futuremergee
            const parent = db.mongoID(cli.routeinfo.path[3]);
            const mergee = db.mongoID(cli.routeinfo.path[4]);

            
        } else {
            cli.throwHTTP(404, undefined, 'Unknown level ' + act);
        }
    }

    adminPUT(cli) {

    }

    adminDELETE(cli) {
        
    }

    getFull(_id, sendback) {
        db.findUnique(cli._c, 'editions', { _id }, (err, ed) => {
            sendback(ed);
        });
    }

    livevar(cli, levels, params, done) {
        const act = levels[0];

        if (act == "level") {
            db.findToArray(cli._c, 'editions', { level : parseInt(levels[1]) }, (err, eds) => {
                done(eds);
            });
        } else if (act == "full") {
            this.getFull(db.mongoID(levels[1]), ed => done(ed));
        } else if (act == "all") {
            db.findToArray(cli._c, 'editions', {}, (err, eds) => {
                done(eds);
            }, {
                displayname : 1, slug : 1, level : 1
            });
        } else {
            done({ error : "Unknown level " + act });
        }
    }
}

module.exports = new EditionController();

/*
 * A section has multiple editions, a name, and a lebel index
 * An article has an array of editions
 *
 * Section {
 *   _id : ObjectId,
 *   index : Number, index 0
 *   displayname : {
 *     lang_code : String, 
 *     ...
 *   }
 * }
 *
 * Edition {
 *   _id : ObjectId,
 *   displayname : {
 *     lang_code : String,
 *     ...
 *   },
 *   slug : {
 *     lang_code : String
 *   }
 * }
 *
 */
