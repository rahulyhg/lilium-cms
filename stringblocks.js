
const db = require('./includes/db');
const filelogic = require('./filelogic');

const COLLECTION_NAME = "stringblocks";

class SBUtils {
    static create(_c, key, value, done) {
        db.insert(_c, COLLECTION_NAME, { key, value }, (err, r) => {done && done(r && r.insertedId)});
    }

    static update(_c, _id, key, value, done) {
        db.update(_c, COLLECTION_NAME, { _id }, { key, value }, () => {done && done()});
    }

    static remove(_c, key, done) {
        db.remove(_c, COLLECTION_NAME, { _id }, () => {done && done()});
    }

    static list(_c, send) {
        db.findToArray(_c, COLLECTION_NAME, {}, (err, arr) => { send(arr); });
    }
}

class StringBlocks {
    adminGET(cli) {
        if (cli.routeinfo.path[2]) {
            cli.throwHTTP(404);
        } else {
            filelogic.serveAdminLML3(cli);
        }
    }

    adminPOST(cli) {
        const action = cli.routeinfo.path[2];

        if (action == "create") {
            SBUtils.create(cli._c, cli.postdata.data.key, cli.postdata.data.value, (_id) => {
                cli.sendJSON({_id});
            });
        } else if (action == "update") {
            SBUtils.update(cli._c, db.mongoID(cli.routeinfo.path[3]), cli.postdata.data.key, cli.postdata.data.value, () => {
                cli.sendJSON({ok : 1});
            });
        } else if (action == "remove") {
            SBUtils.remove(cli._c, db.mongoID(cli.routeinfo.path[3]), () => {
                cli.sendJSON({ok : 1});
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    livevar(cli, levels, params, send) {
        if (levels[0] == "list") {
            SBUtils.list(cli._c, send);
        } else {
            send([]);
        }
    }
}

module.exports = new StringBlocks();
