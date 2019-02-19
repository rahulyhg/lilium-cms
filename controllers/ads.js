const db = require('../lib/db');

class AdsController {
    adminPOST(cli) {
        if (!cli.hasRight('admin')) {
            return cli.throwHTTP(403);
        }   

        if (cli.routeinfo.path[2]) {
            db.update(cli._c, 'ads', { _id: db.mongoID(cli.routeinfo.path[2]) }, { ads: cli.postdata.data.ads }, (err, r) => {
                cli.sendJSON({ success: !err, err });
            });
        } else {
            cli.throwHTTP(404, 'Must specify an adSet ID', true);
        }
    }

    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight('admin')) {
            return cli.throwHTTP(403);
        }   

        const levelOne = levels[0];
        if (levelOne == "list") {
            db.find(cli._c, "ads", {}, [], (err, cur) => {
                cur.sort({_id : 1}).toArray((err, arr) => {
                    sendback(arr);
                });
            });
        } else {
            sendback("");
        }
    }
}

module.exports = new AdsController();
