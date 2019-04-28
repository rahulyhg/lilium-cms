const Controller = require('../base/controller');
const db = require('../lib/db')
const filelogic = require('../pipeline/filelogic');
const ReportGenerator = require('../lib/datareader');

const DR_COLLECTION = "datareaderreports";

class DataReader extends Controller { 
    adminGET(cli) {
        const path = cli.routeinfo.path[2];
        if (!path) {
            filelogic.serveAdminLML3(cli);
        } else if (path == "edit") {
            filelogic.serveAdminLML3(cli, true);
        } else {
            cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {
        if (!cli.hasRight('analyst')) {
            return cli.throwHTTP(403);
        }

        const action = cli.routeinfo.path[2];

        if (action == "new") {
            db.insert(config.default(), DR_COLLECTION, {
                active : true, 
                title : cli.postdata.data.title, 
                description : cli.postdata.data.description, 
                createdOn : new Date()
            }, (err, r) => {
                cli.sendJSON({
                    success : true,
                    redirect : cli._c.server.url + "/admin/datareader/edit/" + r.insertedId
                });
            });
        } else if (action == "save") {
            const dat = cli.postdata.data;
            db.update(config.default(), DR_COLLECTION, {_id : db.mongoID(cli.routeinfo.path[3])}, dat, () => {
                cli.sendJSON({
                    type : "success",
                    title : "Report saved",
                    message : ""
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    livevar(cli, levels, params, send) {
        const section = levels[0];
        if (section == "sites") {
            send(config.getAllSites().map(x => { return {name : x.id, displayname : x.website.sitetitle} }));
        } else if (section == "generate") {
            const id = params.id;
            db.findUnique(config.default(), DR_COLLECTION, {_id : db.mongoID(id)}, (err, single) => {
                single.site = single.site || cli._c.id;
                new ReportGenerator(single).generate((arr, total) => {
                    send({rows : arr, cols : single.projection.split(','), titles : single.tabletitles.split(','), total});
                });
            });

        } else if (section == "single") {
            const id = levels[1];
            db.findUnique(config.default(), DR_COLLECTION, {_id : db.mongoID(id)}, (err, single) => {
                send(single);
            });

        } else if (section == "bunch") {
            const selector = { active : true };
            const filters = params.filters || {};
            
            if (filters.search) {
                selector.name = new RegExp(filters.search);
            }

            db.find(config.default(), DR_COLLECTION, selector, [], (err, cur) => {
                cur.sort({_id : -1}).toArray((err, items) => {
                    send({items});
                });
            });
        } else {
            send([]);
        }
    }

}

module.exports = new DataReader();
