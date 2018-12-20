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

const ALLOWED_TARGETING_FIELDS = ["culture"];

class LiliumAudiences {
    GET(cli) {
        const cultureString = cli.routeinfo.params.culture;
        if (cultureString) {
            const cultures = cultureString.split(',').map(x => x.split('-'));
            const langAudiences = this.audiences[cli._c.id].filter(a => cultures.find(c => c[0] == a.targeting.t_language));

            if (langAudiences.length == 1) {
                cli.sendJSON({ a : langAudiences[0] })
            } else if (langAudiences.length == 0) {
                const finalAudience = this.audiences[cli._c.id].find(a => cultures.find(c => c[1] && c[1] == a.targeting.t_country));

                cli.sendJSON({ a : finalAudience || this.audiences[cli._c.id].default });
            } else {
                const finalAudience = langAudiences.find(a => cultures.find(c => c[1] && c[1] == a.targeting.t_country));

                cli.sendJSON({ a : finalAudience || langAudiences[0] });
            }

            return;
        }
           
        cli.sendJSON({ a : this.audiences[cli._c.id].default });
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

    refreshAudiences() {
        configlib.eachSync(_c => {
            db.findToArray(_c, AUDIENCES_COLLECTION, {}, (err, audiences) => {
                this.audiences[_c.id] = audiences;
                this.audiences[_c.id].default = audiences.find(a => a.default) || audiences[0];
            });
        });
    }

    bindLocalCast() {
        localcast.bind("refresh_audiences", this.refreshAudiences.bind(this));
    }

    preload() {
        this.audiences = {};

        this.bindLocalCast();
        this.refreshAudiences();
    }
}

module.exports = new LiliumAudiences();
