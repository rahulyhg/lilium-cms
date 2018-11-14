const configLib = require('./config');
const db = require('./includes/db');

const BUNCH_PROJECTION = {
    legalname : 1, ssn : 1, startdate : 1,
    enddate : 1, status : 1, position : 1,
    schedule : 1, rate : 1, currency : 1,
    address : 1,

    "entity._id" : 1, "entity.displayname" : 1, "entity.avatarURL" : 1,
    "entity.phone" : 1, "entity.username" : 1, "entity.email" : 1
};

class Staffing {
    adminPOST(cli) {

    }

    livevar(cli, levels, params, sendback) {
        if (levels[0] == "me") {
            db.findUnique(configLib.default(), 'staffing', { _id: db.mongoID(cli.session.data._id) }, (err, staffinfo = {}) => {
                sendback({err, staffinfo});
            });
        } else if (levels[0] == "single" && cli.hasRight('manage-staff')) {
            db.findUnique(configLib.default(), 'staffing', { _id: db.mongoID(levels[1]) }, (err, staffinfo = {}) => {
                sendback({err, staffinfo});
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
