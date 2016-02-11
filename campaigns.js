var log = require('./log.js');
var _c = require('./config.js');
var Products = require('./products.js');
var LiveVars = require('./livevars.js');
var db = require('./includes/db.js');
var filelogic = require('./filelogic.js');
var formbuilder = require('./formBuilder.js');

var cachedCampaigns = new Object();
var registeredStatuses = new Array();

var Campaigns = function() {
	var that = this;

	this.getCampaignsFromDatabase = function(conds, cb) {
		db.findToArray('campaigns', conds, function(err, data) {
			cb(err || data);
		});
	}

	this.loadCampaignsStatuses = function(cb) {
		db.findToArray('campaignStatuses', new Object(), function(err, data) {
            if  (typeof data !== 'undefined') {
                for (var i = 0; i < data.length; i++) {
    				registeredStatuses.push(data[i]);
    			}
            }
			cb();
		});
	}

	this.registerLiveVar = function() {
		// levels : field to query
		// params : {
		//	query : value to query
		//	operator : operator to query with, '=' is none specified
		// };
		LiveVars.registerLiveVariable('campaigns', function(cli, levels, params, callback) {
			var firstLevel = levels[0];

			switch (firstLevel) {
				case "all":
					that.getCampaignsFromDatabase(new Object(), callback);
					break;
				case "mine":
					that.getAllMyCampaigns({clientid:cli.userinfo.userid}, callback);
					break;
			};
		}, ["campaigns"]);
	};

	this.handleGET = function(cli) {
		cli.touch('campaigns.handleGET');
		var root = cli.routeinfo.path.length == 2;

		if (root) {
			filelogic.serveLmlPage(cli);
		} else {
			var actionName = cli.routeinfo.path[2];
			cli.debug();
		}
	};

	this.handlePOST = function(cli) {
		cli.touch('campaigns.handlePOST');
		cli.debug();
	};

	this.registerCreationForm = function() {
		formbuilder.createForm('campaign_create', {
				fieldWrapper : {
					'tag' : 'div',
					'cssPrefix' : 'campaigncreatefield-'
				},
				cssClass : "form-campaign-creation"
			})
			.add('projectid', 'text', {displayname:"Project ID"})
			.add('campname', 'text', {displayname:"Campaign name"})
			.add('campstatus', 'select', {displayname:"Status", datasource: registeredStatuses})
			.add('clientid', 'livevar', {
				endpoint : "entities.query",
				tag : "select",
				template : "option",
				title : "client",
				displayname : "Client",
				props : {
					query : {
						roles : ["advertiser"]
					},
					html : "displayname",
					value : "_id"
				}
			})
			.add('paymentreq', 'checkbox', {displayname:"Payment required prior to production"}, {required:false})
			.add('productstable', 'livevar', {
				endpoint : "products.all",
				tag : "pushtable",
				title : "products",
				displayname : "Products",
				template : "tmpl_productrow",
				datascheme : {
					key : {displayName: "Product", keyName: "displayName", keyValue: "name"},
					columns : [
						{fieldName: "qte", dataType:"number", displayName : "Quantity", defaultValue: 1},
						{fieldName: "price", dataType:"number", displayName: "Price", keyName : "price", prepend:"$"},
						{fieldName: "pricebase", displayName: "Based on", keyName : "priceBase", defaultValue:"unit"}
					],
					footer : {
						title : "Total",
						sumIndexes : [1]
					}
				}
			})
			.add('create', 'submit');
	};

	var init = function() {};
	init();
};

module.exports = new Campaigns();
