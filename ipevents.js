const log = require('./log.js');
const db = require('./includes/db.js');

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

    livevar(cli, levels, params, send) {
        switch (levels[0]) {
            case "top":
                db.find(cli._c, 'ipevents', {count : {$gt : 1}}, [], (err, cur) => {
                    cur.sort({count : -1}).toArray((err, arr) => {
                        send(arr);
                    });
                });
                break;

            case "ip":
                db.findToArray(cli._c, 'ipevents', {ip : levels[1]}, (err, entries) => {
                    send(entries);
                });
                break;

            default:
                send({});
                break
        }
    }
}

module.exports = new IPEvents();
