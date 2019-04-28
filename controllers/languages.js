const Controller = require('../base/controller');
const db = require('../lib/db');

const SL_COLLECTION = 'supportedlanguages';
const ALL_LANGUAGES = require('../lists/languages');

class LiliumLanguages extends Controller {
    adminPOST(cli) {
        const lang = ALL_LANGUAGES.find(x => x.isocode == cli.routeinfo.path[2]);

        if (lang) {
            db.exists(cli._c, SL_COLLECTION, { isocode : cli.routeinfo.path[2] }, (err, exists) => {
                !exists ? db.insert(cli._c, SL_COLLECTION, lang, (err, r) => {
                    cli.throwHTTP(201, undefined, true);
                }) : cli.throwHTTP(409, undefined, true);
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    adminDELETE(cli) {
        const lang = ALL_LANGUAGES.find(x => x.isocode == cli.routeinfo.path[2]);

        if (lang) {
            db.remove(cli._c, SL_COLLECTION, { isocode : lang.isocode }, (err, r) => {
                cli.throwHTTP(200, undefined, true);
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    livevar(cli, levels, params, sendback) {
        if (levels[0] == "all") {
            sendback({ languages : ALL_LANGUAGES });
        } else if (levels[0] == "current") {
            db.findToArray(cli._c, SL_COLLECTION, {}, (err, arr) => {
                sendback(arr);
            }); 
        }
    }
}

module.exports = new LiliumLanguages();
