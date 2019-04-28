const Controller = require('../base/controller');
const configLib = require('../lib/config');
const db = require('../lib/db');

const { terminate, restore, update, getSimple, getFull } = require('../lib/staffing');

class Staffing extends Controller {
    adminDELETE(cli) {
        if (!cli.hasRight('manage-staff')) {
            return cli.throwHTTP(401, undefined, true);
        }

        if (cli.routeinfo.path[2] == "terminate") {
            terminate(db.mongoID(cli.routeinfo.path[3]), db.mongoID(cli.routeinfo.path[4]), () => {
                cli.sendJSON({ revoked : true, terminated : true });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    adminPUT(cli) {
        if (!cli.hasRight('manage-staff')) {
            return cli.throwHTTP(401, undefined, true);
        }

        if (cli.routeinfo.path[2] == "restore") {
            restore(db.mongoID(cli.routeinfo.path[3]), () => {
                cli.sendJSON({ terminated : false });
            });
        } else if (cli.routeinfo.path[2] == "edit") {
            cli.readPostData(dat => {
                update(db.mongoID(cli.routeinfo.path[3]), dat.field, dat.value, () => {
                    cli.sendJSON(dat);
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    livevar(cli, levels, params, sendback) {
        if (levels[0] == "me") {
            getSimple(db.mongoID(cli.session.data._id), (err, staffinfo) => {
                sendback({err, staffinfo});
            });
        } else if (levels[0] == "single" && cli.hasRight('manage-staff')) {
            getFull({ _id : db.mongoID(levels[1]) }, arr => {
                sendback({ staff : arr[0] });
            });
        } else if (levels[0] == "bunch" && cli.hasRight('manage-staff')) {
            const $match = {
                status : 'active'
            };

            if (params.filters && params.filters.status) {
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

            getFull($match, arr => {
                sendback({ items : arr });
            });
        } else {
            cli.throwHTTP(401, undefined, true);
        }
    }
}

module.exports = new Staffing();
