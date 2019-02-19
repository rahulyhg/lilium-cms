const configlib = require('../lib/config');
const db = require('../lib/db');
const xxh = require('xxhashjs')

const AUDIENCES_COLLECTION = 'audiences';

/*
 * AUDIENCE DATABASE STRUCTURE (schema)
 *
 *  Audience {
 *      _id : ObjectId,
 *      displayname : String,
 *      default : Boolean,
 *      public : Boolean,
 *
 *      targeting : {
 *          t_country : String,
 *          t_language : String,
 *          t_... : String
 *      }
 *  }
 */

// { 'hashed_params': <Audience Object> }
let CACHED_RESPONSES = {};

class LiliumAudiences {
    GET(cli) {
        const cultureString = cli.routeinfo.params.culture;
        if (cultureString) {
            
            const hashedParams = xxh.h64(cultureString, 0xAAAA).toString(16);
            const precachedAudience = CACHED_RESPONSES[hashedParams];
            if (precachedAudience) {
                return cli.sendJSON(precachedAudience);
            }

            const cultures = cultureString.split(',').map(x => x.split('-'));
            const langAudiences = this.audiences[cli._c.id].filter(a => cultures.find(c => c[0] == a.targeting.t_language));

            let res;
            if (langAudiences.length == 1) {
                res = { audience : langAudiences[0] };
            } else if (langAudiences.length == 0) {
                const finalAudience = this.audiences[cli._c.id].find(a => cultures.find(c => c[1] && c[1] == a.targeting.t_country));
                res = { audience : finalAudience || this.audiences[cli._c.id].default };
            } else {
                const finalAudience = langAudiences.find(a => cultures.find(c => c[1] && c[1] == a.targeting.t_country));
                res = { audience : finalAudience || langAudiences[0] };
            }

            if (!res.audience.default) {
                CACHED_RESPONSES[hashedParams] = res;
            }

            return cli.sendJSON(res);
        }
           
        cli.sendJSON({ audience : this.audiences[cli._c.id].default });
    }

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

   }

module.exports = new LiliumAudiences();
