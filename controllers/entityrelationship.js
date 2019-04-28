const Controller = require('../base/controller');
const db = require('../lib/db.js');
const filelogic = require('../pipeline/filelogic');
const EntityRelationship = require('../lib/entityrelationship');

class ERModule extends Controller {
    adminGET(cli) {
        if (!cli.hasRight('entityrelationship')) {
            return cli.throwHTTP(403);
        }

        filelogic.serveAdminLML3(cli);
    }

    adminPOST(cli) {
        cli.throwHTTP(403, undefined, true);
    }

    livevar(cli, levels, params, send) {
        let action = levels[0];
        switch (action) {
            case "deepparent":
                EntityRelationship.deepFetch({parent : levels[1]}, send); 
                break;

            case "deep": 
                EntityRelationship.deepFetch({_id : db.mongoID(levels[1])}, send);
                break;

            case "bunch":
                EntityRelationship.getBunch(params, send);
                break;

            default:
                send("[Entityrelationship - Live Variable endpoint undone]");
        }
    }

    setup(that) {
    }
}

module.exports = new ERModule();
