const db = require('./includes/db');

const EDITION_COLLECTION = "editions";
const SECTION_COLLECTION = "sections";

class EditionSection {
    
}

class Edition {
    
}

class EditionController {
    adminPOST(cli) {
        
    }

    adminPUT(cli) {

    }

    adminDELETE(cli) {

    }

    livevar(cli, levels, params, done) {
        
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
