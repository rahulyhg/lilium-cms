const db = require('../lib/db.js');
const filelogic = require('../pipeline/filelogic');
const networkinfo = require('../network/info.js');
const hooks = require('../lib/hooks');

const splib = require('../lib/styledpages');

class StyledPages {
    apiGET(cli) {
        db.findUnique(cli._c, 'styledpages', { slug : cli.routeinfo.path[2], status : "public" }, (err, page) => {
            page ? cli.sendJSON({
                title : page.title,
                content : page.content,
                css : page.customcss,
                js : page.customjs
            }) : cli.throwHTTP(404, 'No such page', true);
        });
    }

    adminPOST(cli) {
        if (!cli.hasRight("styledpages")) { return cli.refuse(); }

        const level = cli.routeinfo.path[2];
        switch (level) {
            case "edit":
                splib.save(cli._c, cli.routeinfo.path[3], cli.postdata.data, (err, success) => {
                    cli.sendJSON({err : err, success : success});
                });

                break;
            case "new":
                const newStyledPage = splib.createNewObject(cli.postdata.data.title, cli.postdata.data.description, cli.postdata.data.slug);
                db.insert(cli._c, 'styledpages', newStyledPage, (err, r) => {
                        hooks.fireSite(cli._c, 'styledpageCreated', {_id : r.insertedId});
                        cli.sendJSON({ created: newStyledPage });
                        log('StyledPages', 'Created new styledpage', 'success');
                    }
                );

                break;
            default:
                cli.throwHTTP(501, 'Method not implemented', true);
        }
    }

    adminDELETE(cli) {
        if (!cli.hasRight("styledpages")) { return cli.refuse(); }
        
        db.update(cli._c, 'styledpages', { _id: db.mongoID(cli.routeinfo.path[2]) }, { deleted: true }, err => {
            if (!err) {
                log('StyledPages', 'Styledpage with id ' + cli.routeinfo.path[2] + ' removed by user ' + cli.userinfo.user, 'warn');
                cli.sendJSON({ success: true });
            } else {
                cli.throwHTTP(500, 'Could not remove styled page', true);
            }
        }, true);
    }

    livevar(cli, levels, params, send) {
        if (!cli.hasRight("styledpages")) { return send(); }

        switch (levels[0]) {
            case 'search': splib.search(cli, levels, params, send); break;
            case 'table': splib.sendTable(cli, levels, params, send); break;
            case 'get'  : splib.getSingle(cli._c, levels[1], send); break;
            default: send([]);
        }
    }

    setup() {
        if (networkinfo.isElderChild()) {
            require('../lib/config').eachSync((site) => {
                db.findToArray(site, 'styledpages', {staticfile : true}, (err, arr) => {
                    arr.forEach(p => splib.generatePage(site, p, () => {}));
                });
            });
        }
    }
};

module.exports = new StyledPages();
