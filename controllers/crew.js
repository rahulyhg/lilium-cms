const Controller = require('../base/controller');
const db = require('../lib/db.js');
const filelogic = require('../pipeline/filelogic');
const config = require('../lib/config');
const crewlib = require('../lib/crew');

class CrewControllers extends Controller {
    adminGET(cli) {
        let action = cli.routeinfo.path[2];
        let extra = {
            ds : require('../badges.js').getDecorationSettings()
        };

        switch(action) {
            case undefined:
                filelogic.serveAdminLML3(cli, false, extra);
                break;

            case "view":
                if (cli.routeinfo.path.length < 4) {
                    cli.throwHTTP(404);
                } else {
                    filelogic.serveAdminLML3(cli, true, extra);
                }
                break;

            default:
                cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {
    
    }

    livevar(cli, levels, params, send) {
        let lvl = levels[0];
        switch (lvl) {
            case "bunch":
                crewlib.getCrewList(params, send);
                break;

            case "single":
                crewlib.getCrewMember(db.mongoID(levels[1] || ""), send);
                break;

            default:
                send("No top level live variable available for 'crew'");
        }
    }

    setup() {

    }

    form() {

    }
}

module.exports = new CrewControllers();
