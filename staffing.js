const configLib = require('./config');
const db = require('./includes/db');

const BUNCH_PROJECTION = {
    legalname : 1, ssn : 1, startdate : 1,
    enddate : 1, status : 1, position : 1,
    schedule : 1, rate : 1, currency : 1,
    address : 1,

    "entity._id" : 1, "entity.displayname" : 1, "entity.avatarURL" : 1,
    "entity.phone" : 1, "entity.username" : 1, "entity.email" : 1, "entity.revoked" : 1
};

class Staffing {
    adminDELETE(cli) {
        if (!cli.hasRight('manage-staff')) {
            return cli.throwHTTP(401, undefined, true);
        }

        if (cli.routeinfo.path[2] == "terminate") {
            db.update(configLib.default(), 'staffing', { _id : db.mongoID(cli.routeinfo.path[3]) }, { status : "terminated" }, () => {
                db.update(configLib.default(), 'entities', { _id : db.mongoID(cli.routeinfo.path[4]) }, { revoked : true }, () => {
                    cli.sendJSON({ revoked : true, terminated : true });
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    adminPOST(cli) {

    }

    adminPUT(cli) {
        if (!cli.hasRight('manage-staff')) {
            return cli.throwHTTP(401, undefined, true);
        }

        if (cli.routeinfo.path[2] == "restore") {
            db.update(configLib.default(), 'staffing', { _id : db.mongoID(cli.routeinfo.path[3]) }, { status : "active" }, () => {
                cli.sendJSON({ terminated : false });
            });
        } else if (cli.routeinfo.path[2] == "edit") {
            cli.readPostData(dat => {
                db.update(configLib.default(), 'staffing', { _id : db.mongoID(cli.routeinfo.path[3]) }, { [dat.field] : dat.value }, () => {
                    cli.sendJSON(dat);
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    livevar(cli, levels, params, sendback) {
        if (levels[0] == "me") {
            db.findUnique(configLib.default(), 'staffing', { _id: db.mongoID(cli.session.data._id) }, (err, staffinfo = {}) => {
                sendback({err, staffinfo});
            });
        } else if (levels[0] == "single" && cli.hasRight('manage-staff')) {
            db.join(configLib.default(), 'staffing', [
                { $match : { _id : db.mongoID(levels[1]) } },
                { $lookup : { from : 'entities', as : 'entity', localField : 'entityid', foreignField : '_id' } },
                { $project : BUNCH_PROJECTION },
                { $unwind : "$entity" }
            ], arr => {
                sendback({ staff : arr[0] });
            });
        } else if (levels[0] == "bunch" && cli.hasRight('manage-staff')) {
            const $match = {
                status : 'active'
            };

            if (params.filters) {
                switch (params.filters.status) {
                    case "everyone":
                        delete $match.status; break;
                    default:
                        $match.status = params.filters.status;
                } 
            }

            if (params.filters.search) {
                $match.legalname = new RegExp(params.filters.search, 'i');
            }

            db.join(configLib.default(), 'staffing', [
                { $match },
                { $lookup : { from : 'entities', as : 'entity', localField : 'entityid', foreignField : '_id' } },
                { $project : BUNCH_PROJECTION },
                { $unwind : "$entity" }
            ], arr => {
                sendback({ items : arr });
            });
        } else {
            cli.throwHTTP(401, undefined, true);
        }
    }
}

module.exports = new Staffing();
