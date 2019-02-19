const db = require('../lib/db.js');
const filelogic = require('../pipeline/filelogic');
const config = require('../lib/config');
const hooks = require('../lib/hooks');

const fixlib = require('../lib/fix');
const PRIORITIES = fixlib.PRIORITIES;
const MODULES = fixlib.MODULES;
const TYPES = fixlib.TYPES;

class Fix {
    livevar(cli, levels, params, send) {
        if (levels[0] == "all") {
            db.findToArray(config.default(), 'fix', {type : "issue", status : {$ne : "closed"}}, (err, issues) => {
                db.findToArray(config.default(), 'fix', {type : "feature", status : {$ne : "closed"}}, (err, features) => {
                    db.findToArray(config.default(), 'fix', {type : "urgent", status : {$ne : "closed"}}, (err, emergencies) => {
                        send({
                            issues : issues.length,
                            featurerequests : features.length,
                            emergencies : emergencies.length,
                            tickets : [...features, ...issues, ...emergencies]
                        })
                    });
                });
            });
        } else if (levels[0] == "deep") {
            fixlib.deepFetch(levels[1], (ticket) => {
                send(ticket);
            });
        } else if (levels[0] == "priorities") {
            var prio = [];
            for (var value in PRIORITIES) {
                prio.push({
                    value : parseInt(value),
                    displayname : PRIORITIES[value]
                });
            }

            send(prio);
        } else if (levels[0] == "types") {
            var types = [];
            for (var value in TYPES) {
                types.push({
                    value : value,
                    displayname : TYPES[value]
                });
            }

            send(types);

        } else if (levels[0] == "modules") {
            var mod = [];
            for (var value in MODULES) {
                mod.push({
                    slug : value,
                    displayname : MODULES[value]
                });
            }

            send(mod);
        } else {
            send(new Error("Unknown fix live variable level structure"));
        }
    }

    adminGET(cli) {
        switch (cli.routeinfo.path[2]) {
            case "ticket":
            case "developer":
                filelogic.serveAdminLML(cli, true);
                break;

            default:
                filelogic.serveAdminLML(cli);
        }
    }

    adminPOST(cli) {
        let ftc = cli.routeinfo.path[2];
        let ctx = cli.routeinfo.path[3];

        switch (ftc) {
            case "open":
                fixlib.open(cli, ctx);
                break;

            case "update":
                fixlib.update(cli, ctx);
                break;

            default : 
                cli.throwHTTP(501);
        }
    }

    form(cli) {

    }
}

module.exports = new Fix();
