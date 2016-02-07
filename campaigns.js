var log = require('./log.js');
var _c = require('./config.js');
var Products = require('./products.js');
var LiveVars = require('./livevars.js');
var db = require('./includes/db.js');
var filelogic = require('./filelogic.js');
var formbuilder = require('./formBuilder.js');

var cachedCampaigns = new Object();

var Campaigns = function() {
	var that = this;

	this.getCampaignsFromDatabase = function(conds, cb) {
		db.findToArray('campaigns', conds, function(err, data) {
			cb(err || data);
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
		});
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

	this.registerCreationForm = function() {
		formbuilder.createForm('campaign_create')
			.add('name', 'text', {displayname:"Campaign name"})
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
			.add('create', 'submit');
	};

	var init = function() {};
	init();
};

module.exports = new Campaigns();
