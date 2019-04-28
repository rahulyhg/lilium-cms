const Controller = require('../base/controller');
const pluginsLib = require('../lib/plugins');
const _c = require('../lib/config');
const db = require('../lib/db.js');
const filelogic = require('../pipeline/filelogic');

class PluginsController extends Controller {
    adminGET(cli) {
        cli.touch("plugins.serveAdminList");
        if (!cli.hasRightOrRefuse("site-admin")) {return;} 

        filelogic.serveAdminLML(cli)
    };

    adminPOST(cli) {
        cli.touch("plugins.handlePOST");
        if (!cli.hasRightOrRefuse("site-admin")) {return;} 

        if (cli.routeinfo.path.length > 2) {
            switch (cli.routeinfo.path[2]) {
            case "registerPlugin":
                pluginsLib.registerPlugin(cli.postdata.data.identifier,  () =>{
                    cli.sendJSON({
                        success: true
                    });
                });
                break;
            case "unregisterPlugin":
                pluginsLib.unregisterPlugin(cli.postdata.data.identifier, () => {

                });

                cli.sendJSON({
                    success: true
                });
                break;
            default:

            }
        } else {
            filelogic.serveAdminLML(cli)
        }
    }

    livevar(cli, levels, params, callback) {
        if (!cli.hasRight("admin")) {return callback([]);} 

        if (levels[0] == 'bunch') {
            db.findToArray(_c.default(), 'plugins', {active : true}, (err, activeplugins) =>{
                pluginsLib.getPluginsDirList((list) => {
                    list.forEach(x => {
                        x.active = !!activeplugins.find(y => x.identifier == y.identifier);
                    });

                    const results = {
                        size: list.length,
                        items: list
                    }

                    callback(results);
                });
            }, {identifier : 1});
        } else {
            callback([]);
        }
    };
}

module.exports = new PluginsController();
