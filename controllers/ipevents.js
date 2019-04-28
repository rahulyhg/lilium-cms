const Controller = require('../base/controller');
const db = require('../lib/db.js');

class IPEvents extends Controller {
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
