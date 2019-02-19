const db = require('../lib/db.js');
const mail = require('../mail.js');
const Admin = require('../backend/admin.js');
const livevars = require('../pipeline/livevars');
const clib = require('../lib/communications');

class CommunicationsLib {
    livevar(cli, levels, params, send) {
        const action = levels[0];
        const type = levels[1];
        const id = levels[2];

        switch (action) {
            case "get":
                clib.fetchThread(cli._c, type, id, send);
                break;    

            default:
                send([]);
        }
    };

    adminPOST(cli) {
        if (cli.routeinfo.path < 4) {
            return cli.sendJSON({error : "Wrong route."});
        }

        let pComm = cli.postdata.data;
        let type = cli.routeinfo.path[2];
        let objectid = db.mongoID(cli.routeinfo.path[3]);

        switch (type) {
            case "article": clib.handlePostArticle(cli, objectid); break;
            default : cli.sendJSON({error : "Invalid type"});
        }
    };

};

module.exports = new CommunicationsLib();
