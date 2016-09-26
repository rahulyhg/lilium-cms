var log = require('../log.js');
var db = require('../includes/db.js');
var config = require('../config.js');
var noOp = require('../noop.js');
var hooks = require('../hooks.js');
var tablebuilder = require('../tableBuilder.js');
var formbuilder = require('../formBuilder.js');

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
        sort[typeof params.sortby !== 'undefined' ? params.sortby : 'date'] = (typeof params.order == "undefined" ? -1 : params.order);
        
        db.aggregate(config.default(), 'prodsocialreport', [{
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
    } else {
        callback({});
    }
};

ProdReport.prototype.createNewReport = function(data, cb) {
    var rep = data;
    rep.status = "active";
    rep.date = new Date();
    rep.rows = [];
    
    for (var i in data.endpoints) {
        var ed = data.endpoints[i];
        if (ed.type && typeof ed.identifier != "undefined") {
            rep.rows.push(ed);
        }
    }

    delete rep.endpoints;
    
    db.insert(config.default(), 'prodsocialreport', rep, function(err, r) {
        cb(err, r);
    });
};

ProdReport.prototype.post = function(cli) {
    switch (cli.routeinfo.path[3]) {
        case "new":
            this.createNewReport(cli.postdata.data, function(err, r) {
                cli.redirect(cli._c.server.url + "/admin/tools/prodreport" + (err ? "?err=" + err : "?created#" + r.insertedId));
            });
            break;
        default:

            cli.throwHTTP(404, 'Not Found');
    }
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
            sotable : false
        }]
    });
}

ProdReport.prototype.registerForm = function() {
    formbuilder.createForm('prodreportstack', {
        formWrapper : {
            tag : 'div',
            class : 'row', 
            id : 'prodreportstack'
        }, 
        fieldWrapper : "lmlform-fieldwrapper"
    }).add('prodreportstack-title', 'title', {
        displayname : "Information"
    }).add('title', 'text', {
        displayname : "Report Name"
    }).add('notes', 'textarea', {
        displayname : "Notes / Details"
    }, {
        required : false
    }).add('prodreportstack-title2', 'title', {
        displayname : "Endpoints"
    }).add('endpoints', 'stack', {
        scheme : {
            columns : [{
                fieldName : "type",
                dataType : "select",
                displayname : "Type",
                dataSource : [
                    {displayname : "Facebook Campaign", value : "fbcamp"},
                    {displayname : "Facebook Post", value : "fbgraph"},
                    {displayname : "URL", value : "url"},
                    {displayname : "Lickstats", value : "lickstats"},
                    {displayname : "Tweet", value : "twitter"},
                    {displayname : "DFP Campaign", value : "dfp"},
                    {displayname : "Instagram", value : "instagram"},
                    {displayname : "Other", value : "other"}
                ]
            }, {
                fieldName : "identifier",
                dataType : "text",
                displayname : "Identifier"
            }]
        }
    }).add('Save and generate', 'submit', {
        displayname : "Save and generate"
    });
};

ProdReport.prototype.register = function() {
    db.createCollection(config.default(), 'prodsocialreport', noOp);
    this.registerTable();
    this.registerForm();
};

ProdReport.prototype.pulloutReport = function(reportname, cb) {

};

module.exports = new ProdReport();
