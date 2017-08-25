const log = require('./log')
const filelogic = require('./filelogic')
const db = require('./includes/db')
const config = require('./config')
const formbuilder = require('./formBuilder')

const DR_COLLECTION = "datareaderreports";
const NETWORK_TABLE = ["entities", "cakepops", "fix", "decorations", "feed", "roles"];

class ReportGenerator {
    constructor(single) {
        this.report = single
        this.smap = ReportGenerator.createSMap();

        if (NETWORK_TABLE.includes(this.report.maincollection)) {
            this.report.site = config.default().id;
        }
        this.build();
    }

    static createSMap() {
        const date = new Date();
        const now = date.getTime();
        const day = 1000 * 60 * 60 * 24;

        const firstDayOfMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstDayOfYearDate = new Date(date.getFullYear(), 0, 1);
        const monthAgoDate = new Date(date.getFullYear(), date.getMonth() - 1);
        const yearAgoDate = new Date(date.getFullYear() - 1);

        const firstDayOfMonth = firstDayOfMonthDate.getTime();
        const firstDayOfYear = firstDayOfYearDate.getTime();
        const monthAgo = monthAgoDate.getTime();
        const yearAgo = yearAgoDate.getTime();

        return {
            "true" : true,
            "false" : false,

            DESC : -1, 
            ASC : 1,
            
            "24ago" : now - day, "24agoDate" : new Date(now - day),
            today : now - (now % day), todayDate : new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            yesterday : now - (now % day) - day, yesterdayDate : new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1),

            now, nowDate : date, 
            firstDayOfMonth, firstDayOfMonthDate, 
            firstDayOfYear, firstDayOfYearDate, 
            monthAgo, monthAgoDate,
            yearAgo, yearAgoDate
        };
    }

    parseField(value) {
        return !isNaN(value) ? parseInt(value) : this.smap.hasOwnProperty(value) ? this.smap[value] : value;
    }

    feedOperator(key, value) {
        if (!value || !value.trim()) {
            return key;
        }

        const operation = {};
        const keys = key.split(',');
        const values = value.split(',');

        for (let i = 0; i < keys.length; i++) {
            let val = values[i];
            if (val.includes(':')) {
                let split = val.split('|');
                val = {};

                split.forEach(kv => {
                    kv = kv.split(':');
                    val[kv[0]] = this.parseField(kv[1]); 
                });
            } else {
                val = this.parseField(val);
            }

            operation[keys[i]] = val; 
        }

        return operation;
    }

    build() {
        this.join = this.report.aggregation.map(x => {
            return {
                [x.method] : this.feedOperator(x.operator, x.value)
            };
        });

        const pFields = this.report.projection.split(',');
        const projection = { $project : { _id : 0} };
        pFields.forEach(f => {
            projection.$project[f] = 1
        });

        this.join.push(projection);
        return this;
    }

    generate(send) {
        db.rawCollection(this.report.site, this.report.maincollection, {}, (err, col) => {
            col.count({}, (err, total) => {
                col.aggregate(this.join, (err, arr) => send(arr, total));
            });
        });
    }
}

class DataReader { 
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
        .add('site', 'liveselect', {
            endpoint: 'datareader.sites',
            select : {
                value : 'name',
                displayname : 'displayname'
            },
            empty : {
                displayname : " - Current site - "
            },
            displayname: "Queried website"
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
        .add('ag-title', 'title', {
            displayname : "Aggregation"
        })
        .add('aggregation', 'stack', {
            scheme : {
                columns : [
                    { fieldName : "method", dataType : "select", displayname : "Method", dataSource : [
                        { name : "$match",   displayname : "Match" },
                        { name : "$project", displayname : "Projection" },
                        { name : "$sort",    displayname : "Order / Sort" },
                        { name : "$regex",   displayname : "Regular Expression" },
                        { name : "$lookup",  displayname : "Join lookup" },
                        { name : "$unwind",  displayname : "Unwind lookup" },
                        { name : "$group",   displayname : "Group" },
                        { name : "$limit",   displayname : "Limit results" },
                        { name : "$skip",    displayname : "Skip results" }
                    ] },
                    { fieldName : "operator", dataType : "text", displayname : "Operator / Field" },
                    { fieldName : "value", dataType : "text", displayname : "Value" }
                ]
            }
        })
        .add('projection', 'text', {
            displayname : "Projection"
        })
        .add('tabletitles', 'text', {
            displayname : "Projection display names"
        })
        .add("actions", 'buttonset', {
            buttons : [
                {
                    name : "save",
                    displayname : "Save",
                    type : "button",
                    classes : ["btn-save"]
                }, {
                    name : "generate",
                    displayname : "Generate",
                    type : "button",
                    classes : ["btn-preview"]
                }
            ]
        })
    }
}

module.exports = new DataReader();
