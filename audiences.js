const configlib = require('./config');
const db = require('./includes/db');

const sharedcache = require('./sharedcache');
const localcast = require('./localcast');

const AUDIENCES_COLLECTION = 'audiences';

/*
 * AUDIENCE DATABASE STRUCTURE (schema)
 *
 *  Audience {
 *      _id : ObjectId,
 *      displayname : String,
 *      public : Boolean,
 *
 *      t_country : String,
 *      t_language : String,
 *
 *      [t_...] : String
 *  }
 */
class LiliumAudiences {
    adminPOST(cli) {
        
    }

    adminPUT(cli) {

    }

    adminDELETE(cli) {

    }

    livevar(cli, levels, params, sendback) {
        if (levels[0] == "all") {
            sendback({ audiences : this.audiences });
        } else if (levels[0] == "single") {
            const audience = this.audiences.find(a => a._id.toString() == levels[1]);
            audience ? sendback({ audience }) : cli.throwHTTP(404, undefined, true);
        } else {
            cli.throwHTTP(404, 'Unknown top level', true);
        }
    }

    refreshAudiences() {
        configlib.eachSync(_c => {
            db.findToArray(_c, AUDIENCES_COLLECTION, {}, (err, audiences) => {
                this.audiences = audiences;
            });
        });
    }

    bindLocalCast() {
        localcast.bind("refresh_audiences", this.refreshAudiences.bind(this));
    }

    preload() {
        this.bindLocalCast();
        this.refreshAudiences();
    }
}

module.exports = new LiliumAudiences();
