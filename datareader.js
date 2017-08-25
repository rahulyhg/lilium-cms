const log = require('./log')
const filelogic = require('./filelogic')
const db = require('./includes/db')
const config = require('./config')
const formbuilder = require('./formBuilder')

const DR_COLLECTION = "datareaderreports";

class DataReader {
    generator() {

    }
    
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

        } else if (aciton == "generate") {

        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    livevar(cli, levels, params, send) {
        const section = levels[0];
        if (section == "sites") {
           send(config.getAllSites().map(x => x.id));
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

    form() {
        formbuilder.createForm('datareader_report', {
            formWrapper : {
                tag : 'div',
                class : 'row',
                id : 'datareader_report', 
                inner : true
            },
            fieldWrapper : "lmlform-fieldwrapper"
        })
        .add("title", "text", {
            displayname : "Title"
        })
        .add("description", "text", {
            displayname : "Description"
        })
        .add('maincollection', 'select', {
            displayname : "Queried collection",
            datasource : [
                { displayName : "Content / Articles", name : "content" },
                { displayName : "Cakepops", name : "cakepops" },
                { displayName : "Chains", name : "contentchains" },
                { displayName : "Reports", name : "datareaderreports" },
                { displayName : "Decorations / Badges", name : "decorations" },
                { displayName : "Entities", name : "entities" },
                { displayName : "What's up Feed", name : "feed" },
                { displayName : "Tickets", name : "fix" },
                { displayName : "Content history", name : "history" },
                { displayName : "Email templates", name : "mailtemplates" },
                { displayName : "Search queries", name : "searches" },
                { displayName : "Styled pages", name : "styledpages" },
                { displayName : "Topics", name : "topics" },
                { displayName : "Uploads", name : "uploads" }
            ]
        })
        .add('aggregation', 'stack', {
            displayname : "Aggregation",
            scheme : {
                columns : [
                    { fieldName : "", dataType : "", displayname : "" }
                ]
            }
        })
    }
}

module.exports = new DataReader();
