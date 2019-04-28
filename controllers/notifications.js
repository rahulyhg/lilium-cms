const Controller = require('../base/controller');
const db = require('../lib/db.js');

class NotificationController extends Controller {
    adminPOST(cli) {
        switch (cli.routeinfo.path[2]) {
            case "seeall" : {
                db.update(cli._c, 'notifications', { userID : db.mongoID(cli.userinfo.userid), interacted : false }, { interacted : true }, (err, r) => {
                    err ? cli.throwHTTP(500, err, true) : cli.sendJSON({ updated : !!r.result.modifiedCount, total : r.result.modifiedCount });
                })
            } break;

            case "seeone" : {
                db.update(cli._c, 'notifications', { userID : db.mongoID(cli.userinfo.userid), _id : db.mongoID(cli.routeinfo.path[3]) }, { interacted : true }, (err, r) => {
                    err ? cli.throwHTTP(500, err, true) : cli.sendJSON({ updated : !!r.result.modifiedCount });
                })
            } break;

            default : cli.throwHTTP(404, undefined, true);
        }
    }
}

module.exports = new NotificationController();
