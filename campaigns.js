var log = require('./log.js');
var _c = require('./config.js');
var Products = require('./products.js');
var LiveVars = require('./livevars.js');
var db = require('./includes/db.js');
var filelogic = require('./filelogic.js');
var formbuilder = require('./formBuilder.js');
var hooks = require('./hooks.js');

var cachedCampaigns = new Object();
var registeredStatuses = new Array();

var Campaigns = function() {
	var that = this;

	this.getCampaignsFromDatabase = function(conds, cb) {
		db.findToArray('campaigns', conds, function(err, data) {
			cb(err || data);
		});
	}

	this.getCampaignByProjectID = function(id, cb) {
		db.findToArray('campaigns', {"projectid" : id}, function(err, data) {
			if (!err && data.length > 0) {
				data[0].tablekey = id;
			}

			cb(err || data[0]);
		});
	};

    	this.getAllMyCampaigns = function(conds, cb) {
     		db.findToArray('campaigns', conds, function(err, data) {
			cb(err || data);
		});
    	};

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

	var statusByName = function(statusname) {
		var status = undefined;
		for (var i = 0; i < registeredStatuses.length && !status; i++) {
			if (registeredStatuses[i].name == statusname) {
				status = registeredStatuses[i];
			}
		};

		return status;
	};

	var formatEntriesForList = function(entries, callback) {
		var arr = new Array();
		var max = entries.length;
		var index = 0;

		var nextEntry = function() {
			if (index == max) {
				return callback(arr);
			}

			var entry = entries[index];
			var listObj = {
				projectid : entry.projectid,
				name : entry.campname,
				status : statusByName(entry.campstatus).displayName,
				clientid : entry.clientid,
				url : _c.default.server.url + "/admin/campaigns/edit/" + entry.projectid
			}

			db.findToArray('entities', {_id:db.mongoID(listObj.clientid)}, function(err, res) {
				listObj.clientname = res[0].displayname;
				arr.push(listObj);

				index++;
				nextEntry();
			});
		};

		nextEntry();
	};

	this.registerLiveVar = function() {
        var that = this;
		// levels : field to query
		// params : {
		//	query : value to query
		//	operator : operator to query with, '=' is none specified
		// };
		LiveVars.registerLiveVariable('campaigns', function(cli, levels, params, callback) {
			var firstLevel = levels[0];

			switch (firstLevel) {
				case "all":
					if (cli.isGranted['campaigns']) {
						that.getCampaignsFromDatabase(new Object(), callback);
					} else {
						callback();
					}
					break;
				case "list":
					that.getCampaignsFromDatabase(new Object(), function(arr) {
						formatEntriesForList(arr, callback);
					});
					break;
				case "mine":
					if (cli.isGranted('advertiser')) {
						console.log(isNaN(cli.userinfo.userid));
						that.getAllMyCampaigns({clientid: cli.userinfo.userid.toString()}, callback);
					} else {
						callback();
					}
					break;
				case "get":
					var projectid = levels[1];

					if (projectid) {
						that.getCampaignByProjectID(projectid, callback);
					} else {
						callback("[CampaignException] ProjectID must be specified as a third level");
					}
					break;
			};
		});
	};

	this.handleGET = function(cli) {
		cli.touch('campaigns.handleGET');
		var hasParam = cli.routeinfo.path.length > 2;

		filelogic.serveLmlPage(cli, hasParam);
	};

	var cliToDatabaseCampaign = function(cli) {
		cli.touch('campaigns.clitodatabasecampaign');

		var postdata = cli.postdata.data;
		var products = new Array();

		for (var key in postdata.productstable) {
			products.push(postdata.productstable[key]);
		}

		return {
			"projectid": postdata.projectid,
			"campname":  postdata.campname,
			"campstatus": postdata.campstatus,
			"clientid": postdata.clientid,
			"paymentreq": postdata.paymentreq && postdata.paymentreq == "on",
			"products" : products
		};
	};

	this.handlePOST = function(cli) {
		cli.touch('campaigns.handlePOST');

		var stack = formbuilder.validate(formbuilder.handleRequest(cli), true);
		var action = cli.routeinfo.path[2] || 'new';

		if (true || stack.valid) {
			dbCamp = cliToDatabaseCampaign(cli);

			switch (action) {
				case 'new':
					db.insert('campaigns', dbCamp, function(res) {
						hooks.trigger('campaignCreated', dbCamp);
						cli.redirect(_c.default.server.url + cli.routeinfo.fullpath + "/edit/" + dbCamp.projectid, false);
					});
					break;
				case 'edit':
					db.findToArray('campaigns', {projectid : dbCamp.projectid}, function(err, old) {
						db.update('campaigns', {projectid : dbCamp.projectid}, dbCamp, function(res) {
							hooks.trigger('campaignUpdated', {
								"old" : err || old[0],
								"new" : dbCamp
							});

							if (!err && old[0] && old[0].campstatus != dbCamp.cmapstatus) {
								hooks.trigger('campaignStatusChanged', {
									"old" : old[0],
									"new" : dbCamp
								});
							}

							cli.redirect(_c.default.server.url + cli.routeinfo.fullpath, false);
						}, false, true);
					});
					break;
				default: 
					cli.debug();
			}
		} else {
			cli.redirect(_c.default.server.url + cli.routeinfo.fullpath + "?invalidform", false);
		}
	};

	this.registerCreationForm = function() {
		formbuilder.createForm('campaign_create', {
				fieldWrapper : {
					'tag' : 'div',
					'cssPrefix' : 'campaigncreatefield-'
				},
				cssClass : "form-campaign-creation"
			})
			.add('projectid', 'text', {displayname:"Project ID", editonce: true})
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
					key : {displayName: "Product", keyName: "displayName", keyValue: "name", readKey: "prodid"},
					columns : [
						{fieldName: "qte", dataType:"number", displayName : "Quantity", defaultValue: 1, 
							influence : {
								fieldName : "price",
								eq : "*"
							}
						},
						{fieldName: "price", dataType:"number", displayName: "Price", keyName : "price", prepend:"$"},
						{fieldName: "pricebase", displayName: "Based on", keyName : "priceBase", defaultValue:"unit"},	
						{fieldName: "enddate", dataType:"date", displayName: "End Date", keyName : "enddate"},
						{fieldName: "website", displayName: "Website", keyName: "website", 
							autocomplete : {
								datasource: "sites.all",
								keyName : "displayName",
								keyValue : "name"
							}
						}
					],
					footer : {
						title : "Total",
						sumIndexes : [1]
					}
				}
			})
			.add('save', 'submit', {onlyWhen:"new", displayName:'Save'});
	};

	var init = function() {};
	init();
};

module.exports = new Campaigns();
