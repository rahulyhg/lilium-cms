const Controller = require('../base/controller');
const filelogic = require('../pipeline/filelogic');
const conf = require('../lib/config');
const db = require('../lib/db.js');
const mongo = require('mongodb');

const rlib = require('../lib/role');

class RoleController extends Controller {
    adminPOST(cli) {
        if (!cli.hasRight('edit-roles')) {
            cli.refuse();
            return;
        }

        cli.touch('role.handlePOST');
        switch (cli.routeinfo.path[2]) {
            case "quickedit":
                rlib.quickEdit(cli);
                break;
            case 'create':
                rlib.new(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
        }
    };

    adminGET(cli) {
        cli.touch('role.handleGET');
        if (!cli.hasRight('edit-roles')) {
            cli.refuse();
            return;
        }

        if (cli.routeinfo.path.length == 2) {
            cli.redirect(cli._c.server.url + "admin/role/list", true);
        } else {
            switch (cli.routeinfo.path[2]) {
            case "list":
                filelogic.serveAdminLML3(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
            }
        }
    };

    livevar(cli, levels, params, callback) {
        let allContent = levels.length === 0;

        if (levels[0] == "bunch") {
            db.findToArray(conf.default(), 'roles', { $and : [ 
                { name : { $ne : "admin" }}, 
                { name : { $ne : "lilium" }} 
            ]}, (err, roles) => {
                callback({ items : roles, total : roles.length });
            }); 
        } else {
            db.findToArray(conf.default(), 'roles', {$or : [{'pluginID': false}, {'pluginID': null}]}, (err, roles) => {
                if (allContent || levels[0] == "all") {
                    db.findToArray(conf.default(), 'roles', { }, (err, arr) => {
                        callback(arr);
                    });
                } else {
                    db.multiLevelFind(conf.default(), 'roles', levels, {
                        _id: db.mongoID(levels[0])
                    }, {
                        limit: [1]
                    }, callback);
                }
            });
        }
    }

};

module.exports = new RoleController();
