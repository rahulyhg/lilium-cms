const log = require('./log.js');
const db = require('./includes/db.js');
const config = require('./config.js');
const admin = require('./backend/admin.js');
const livevars = require('./livevars.js');
const filelogic = require('./filelogic.js');
const noop = require('./noop.js');

class LMLFeed {
    setup() {
        db.createCollection(config.default(), 'feed', noop);
    }

    adminGET(cli) {
        filelogic.serveAdminLML3(cli);
    };

    livevar(cli, levels, params, cb) {
        db.find(config.default(), 'feed', {}, [], (err, cur) => {
            cur.sort({_id : -1}).limit(params.limit || 50).skip(params.skip || 0).toArray((err, arr) => {
                cb(arr.reverse());
            });
        });
    };

    // Card anatomy
    /*
        Someone did something on a website at a time
        Action payload includes copied data, sometimes IDs
    */
    push(extid, actor, action, site, extra, cb) {
        const item = { extid, actor, action, extra, site, time : new Date(), };
        db.insert(config.default(), 'feed', item, () => {
            require('./notifications.js').broadcast(item, 'feed');
            cb && cb();
        });
    };

    plop(extid, cb, isDirectId) {
        const conds = {};
        conds[isDirectId ? "_id" : "extid"] = extid;

        db.remove(config.default(), 'feed', conds, cb || noop);
    };
}

module.exports = new LMLFeed();
