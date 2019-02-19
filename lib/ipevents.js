const db = require('./db.js');

const noop = () => {};

class IPEvents {
    push(_c, ip, ev, url, extra, cb) {
        db.rawCollection(_c, 'ipevents', {}, (err, collection) => {
            collection.updateOne({
                ip : ip,
                ev : ev
            }, {
                $inc : {count : 1},
                $addToSet : {urls : url},
                $set : {extra : extra}
            }, {
                upsert : true
            }, cb || noop)
        });
    }
}

module.exports = new IPEvents();
