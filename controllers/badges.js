const Controller = require('../base/controller');
const blib = require('../lib/badges');
const db = require('../lib/db');
const config = require('../lib/config');
const hooks = require('../lib/hooks');

const DEFAULT_HOOKS_PRIO = 10000;

class BadgesController extends Controller {
    adminGET(cli) {
        let action = cli.routeinfo.path[2];
        switch (action) {
            case "fetch" : 
                db.findToArray(
                    config.default(), 
                    'decorations', 
                    {entity : db.mongoID(cli.userinfo.userid), unread : true}, 
                (err, arr) => {
                    let badges = [];
                    arr.forEach(x => badges.push(blib.EntityBadge.generateBadgeNotification(x.entity, x.slug, x.level)));
                    cli.sendJSON({
                        hasNew : arr.length,
                        badges
                    });
                });
                break;
            case "read":
                db.update(config.default(), "decorations", {entity : db.mongoID(cli.userinfo.userid)}, {unread : false}, () => {
                    cli.sendJSON({ok : 1});
                });
                break;
            default:
                cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {
        // Allowed top levels : create, edit, give, take
        if (!cli.hasRight(ADMIN_POST_RIGHT)) {
            return cli.throwHTTP(403, undefined, true);
        }
    }

    // decorations
    livevar(cli, levels, params, send) {
        if (levels.length == 0) {
            return send(new Error("Required first level for live variable 'decorations'"));
        }

        // Allowed bot level : entity, all, one
        switch (levels[0]) {
            case "entity": blib.fetchEntityDeco(db.mongoID(levels[1]), send); break;
            case "mine":   blib.fetchEntityDeco(db.mongoID(cli.userinfo.userid), send); break;
            case "all":    blib.fetchAllDeco(send); break;
            case "one":    blib.fetchOneDeco(db.mongoID(levels[1]), send); break;
            case "board":  blib.fetchBoard(send); break;
            default: send(new Error("Undefined top level " + levels[0]))
        }
    }

    registerHooks() {
        const DEFAULT_BADGES = blib.DEFAULT_BADGES;

        for (let i = 0; i < DEFAULT_BADGES.length; i++) {
            hooks.register(DEFAULT_BADGES[i].hook, DEFAULT_HOOKS_PRIO + i, pkg => {
                blib.BadgeValidator.validate(DEFAULT_BADGES[i].slug, pkg)
            });
        }
    }

    setup() {
        this.registerHooks();
    }
}

module.exports = new BadgesController();
