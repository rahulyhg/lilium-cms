var log = require('../log.js');
var db = require('../includes/db.js');
var config = require('../config.js');
var noOp = require('../noop.js');
var hooks = require('../hooks.js');
var tablebuilder = require('../tableBuilder.js');
var filelogic = require('../filelogic.js');

var supportedAPIs = [
    "fb-ads",
    "fb-graph",
    "instagram",
    "analytics",
    "lickstats",
    "twitter",
    "dfp"
];

// Load APIs
var APIs = {
    google : require('googleapis'),
    twitter : require('twitter'),
    dfp : require('node-google-dfp'),
    instagram : require('instagram-node').instagram()
};

// Prod Report 
var ProdReport = function() {};
ProdReport.prototype.name = "prodsocialreport"; 
ProdReport.prototype.displayname = "Production Social Report"; 
ProdReport.prototype.rights = ["production"]; 
ProdReport.prototype.endpoint = "prodreport"; 
ProdReport.prototype.icon = "fa-bar-chart"; 

ProdReport.prototype.livevar = function(cli, levels, params, callback) {
    if (levels[1] == "table") {
        var sort = {};
        var match = {status : {$ne : "archived"}};
        sort[typeof params.sortby !== 'undefined' ? params.sortby : 'date'] = (typeof params.order == "undefined" ? -1 : params.order);
        if (params.sortby === "status") {
            delete match.status;
            sort["date"] = -1;
        }
        
        db.aggregate(config.default(), 'prodsocialreport', [{
            $match : match
        }, {
            $sort: sort
        }, {
            $skip : (params.skip || 0)
        }, {
            $limit : (params.max || 20)
        }], function(arr) {
            db.count(config.default(), 'prodsocialreport', {}, function(err, total) {
                callback({
                    data : arr,
                    length : total
                });
            });
        });
    } else if (levels[1] == "report") {
        var id = levels[2];
        if (!id) {
            return callback(new Error("[LiveVariableException] The report endpoint requires an id level"));
        }

        this.pulloutReport(db.mongoID(id), function(err, rep) {
            if (err) {
                callback(err);
            } else {
                db.update(config.default(), "prodsocialreport", {_id : db.mongoID(id)}, {
                    $push : {
                        "history" : { report : rep, date : new Date() }
                    }
                }, function(err, r) {
                    callback(rep);
                }, false, true, true);
            }
        });
    } else if (levels[1] == "history") { 
        var id = levels[2];
        if (!id) {
            return callback(new Error("[LiveVariableException] The report endpoint requires an id level"));
        }

        callback([]);
    } else if (levels[1] == "get") {
        var id = levels[2];
        if (!id) {
            return callback(new Error("[LiveVariableException] The report endpoint requires an id level"));
        }

        db.findToArray(config.default(), "prodsocialreport", {_id : db.mongoID(id)}, function(err, arr) {
            callback(arr[0]);
        });
    } else {
        callback({});
    }
};

ProdReport.prototype.editReport = function(data, id, cb) {
    var rep = data;
    
    for (var i in data.endpoints) {
        var ed = data.endpoints[i];
        if (!ed.type || typeof ed.identifier === "undefined") {
            delete data.endpoints[i];
        }
    }
    
    db.modify(config.default(), 'prodsocialreport', {_id : db.mongoID(id)}, rep, function(err, r) {
        cb(err, r);
    });

};

ProdReport.prototype.createNewReport = function(data, cb) {
    var rep = data;
    rep.status = "active";
    rep.date = new Date();
    rep.history = [];
    
    for (var i in data.endpoints) {
        var ed = data.endpoints[i];
        if (!ed.type || typeof ed.identifier === "undefined") {
            delete data.endpoints[i];
        }
    }
    
    db.insert(config.default(), 'prodsocialreport', rep, function(err, r) {
        cb(err, r);
    });
};

ProdReport.prototype.get = function(cli) {
    switch (cli.routeinfo.path[3]) {
        case "generate":
        case "edit":
            filelogic.serveAdminLML(cli, true);
            return true;
        default:
            return false;
    }
};

ProdReport.prototype.post = function(cli) {
    switch (cli.routeinfo.path[3]) {
        case "new":
            this.createNewReport(cli.postdata.data, function(err, r) {
                cli.redirect(cli._c.server.url + "/admin/tools/prodreport" + (err ? "?err=" + err : "/generate/" + r.insertedId));
            });
            break;
        case "edit":
            this.editReport(cli.postdata.data, cli.routeinfo.path[4], function(err, r) {
                cli.redirect(cli._c.server.url + "/admin/tools/prodreport" + (err ? "?err=" + err : "/generate/" + cli.routeinfo.path[4]));
            });
            break;
        case "archive":
            this.archiveReport(cli.routeinfo.path[4], function(err) {
                cli.sendJSON({ok : !err, err : err});
            });
            break;
        default:
            cli.throwHTTP(404, 'Not Found');
    }
};

ProdReport.prototype.archiveReport = function(id, cb) {
    db.update(config.default(), "prodsocialreport", {_id : db.mongoID(id)}, {status : "archived"}, cb);
};

ProdReport.prototype.registerTable = function() {
    tablebuilder.createTable({
        name : "prodreportlist",
        endpoint: 'tools.prodsocial.table',
        paginate: true,
        max_results : 50,
        sortby : 'date',
        sortorder : -1,
        fields : [{
            key : 'title',
            displayname : "Title",
            template : "table-name",
            sortable : true
        }, {
            key : 'status', 
            displayname : "Status", 
            template : "table-status",
            sortable : true
        }, {
            key : 'notes',
            displayname : "Notes", 
            template : "table-notes",
            sortable : false
        }, {
            key : '',
            displayname : "Actions",
            template : 'table-actions',
            sortable : false
        }]
    });
}

ProdReport.prototype.registerForm = function() {

};

ProdReport.prototype.register = function() {
    db.createCollection(config.default(), 'prodsocialreport', noOp);
    this.registerTable();
    this.registerForm();
};

ProdReport.prototype.pulloutReport = function(reportid, cb) {
    cb(undefined, {facebook : 1, twitter : 2, instagram : 3});
};

module.exports = new ProdReport();
