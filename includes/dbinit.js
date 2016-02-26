var mongoDocuments = {
	names : [
		"entities", "roles", "plugins", "themes", "config", "compiledfiles",
		"sites", "discussions", "types", "vocab", "content", "sessions", "dfpcache",
		"lilium", "uploads", "cachedFiles", "campaigns", "products", "dfp",
		"producttypes", "productpricebases", "changerequests", "campaignStatuses"
	]
};

var typesDefaultStructure = {
	name : "article",
	coolname : "Article",
	endpoint : "/",
	allowedQueryVars : ['preview', 'secret'],
	vocabRoot : "articles",
	backendAccess : "write",
	frontendAccess : "visit",
	content : ["title", "subtitle", "snippet", "body", "social", "cover", "date"],
	status : ["draft", "live", "trashed", "deleted"]
};

var defaultCampaignStatuses = [
	{name:"new", displayName:"New"},
	{name:"preprod", displayName:"Preproduction"},
	{name:"clisign", displayName:"Pending Client Signature"},
	{name:"clipayment", displayName:"Pending Client Payment"},
	{name:"clipending", displayName:"Pending Client Action"},
	{name:"prod", displayName:"Production"},
	{name:"review", displayName:"Reviewed"},
	{name:"ready", displayName:"Ready"},
	{name:"ongoing", displayName:"Ongoing"},
	{name:"cliendpay", displayName:"Pending Client Closure"},
	{name:"finished", displayName:"Finished"}
];

var adminEntity = {
	id : 0,
	username : "lilium",
	shhh : "94b0e5af2818df258cc6afb86383586e68f071fd36ff780096b13a7a47d8e275",
	email : "",
	roles : ["lilium", "admin"],
	displayname : "Lilium Administrator",
	avatarID : 0,
	createdOn : new Date(),
	data : {
		facebookUsername : "",
		twitterUsername : "",
		googleUsername : "",
		instagramUsername : "",
		birthday : new Date()
	}
};

var defaultProductTypes = [
	{name:"bannerads",displayName:"Banner Ads"},
	{name:"email",displayName:"Email"},
	{name:"sponsedit",displayName:"Sponsored Editorial"},
	{name:"twitter",displayName:"Twitter"},
	{name:"instagram",displayName:"Instagram"},
	{name:"facebook",displayName:"Facebook"},
	{name:"snapchat",displayName:"Snapchat"},
	{name:"video",displayName:"Video"},
	{name:"other",displayName:"Other"}
];

var defaultPriceBases = [
	{name:"unit",displayName:"Unit",divider:1},
	{name:"cpm",displayName:"CPM",divider:1000},
	{name:"cpc",displayName:"CPC",divider:1},
	{name:"cpv",displayName:"CPV",divider:1}
];

var defaultProducts = [
	{name:"banbigbox",displayName:"Banner Ads - Big Box",productType:"bannerads",priceBase:"cpm",price:10,active:true},
	{name:"banbigboxm",displayName:"Banner Ads - Big Box (Mobile)",productType:"bannerads",priceBase:"cpm",price:10,active:true},
	{name:"banbillboard",displayName:"Banner Ads - Billboard",productType:"bannerads",priceBase:"cpm",price:10,active:true},
	{name:"bancompto",displayName:"Banner Ads - Companion Takeover",productType:"bannerads",priceBase:"unit",price:500,active:true},
	{name:"banlskysc",displayName:"Banner Ads - Large Skyscraper",productType:"bannerads",priceBase:"cpm",price:10,active:true},
	{name:"banlb",displayName:"Banner Ads - Leaderboard",productType:"bannerads",priceBase:"cpm",price:10,active:true},
	{name:"banskysc",displayName:"Banner Ads - Skyscraper",productType:"bannerads",priceBase:"cpm",price:10,active:true},
	{name:"bantakeover",displayName:"Banner Ads - Takeover",productType:"bannerads",priceBase:"cpm",price:30,active:true},
	{name:"email",displayName:"Email Discovery",productType:"email",priceBase:"unit",price: 500,active:true},
	{name:"fbdisc",displayName:"Facebook Discovery",productType:"facebook",priceBase:"unit",price: 15,active:true},
	{name:"twdisc",displayName:"Twitter Discovery",productType:"twitter",priceBase:"unit",price: 0,active:true},
	{name:"igdisc",displayName:"Instagram Discovery",productType:"instagram",priceBase:"unit",price: 15,active:true},
	{name:"igpush",displayName:"Instagram Push",productType:"instagram",priceBase:"unit",price: 750,active:true},
	{name:"snapstory",displayName:"Snapchat Story",productType:"snapchat",priceBase:"unit",price: 300,active:true},
	{name:"seditbasic",displayName:"Sponsored Editorial - Basic",productType:"sponsedit",priceBase:"unit",price: 725,active:true},
	{name:"seditstand",displayName:"Sponsored Editorial - Standard",productType:"sponsedit",priceBase:"unit",price: 1500,active:true},
	{name:"seditprem",displayName:"Sponsored Editorial - Premium",productType:"sponsedit",priceBase:"unit",price: 2000,active:true},
	{name:"seditrev",displayName:"Revision (Sponsored Editorial)",productType:"other",priceBase:"unit",price: 120,active:true},
	{name:"svideo",displayName:"Sponsored Video",productType:"video",priceBase:"unit",price: 3000,active:true},
	{name:"other",displayName:"Other",productType:"other",priceBase:"unit",price: 0,active:true}
];

var defaultTheme = {
	id : 0,
	uName : 'flowerg',
	dName : 'Flower Garden',
	active : true,
	creators : [{
		fullname : 'Erik Desjardins',
		website : "http://erikdesjardins.com",
		license : 'MIT',
		role : 'Developer'
	}],
	path: 'garden',
	website : 'http://liliumcsm.com/themes/flowerg',
	requiredModule : []
};

var defaultPlugin = {
	identifier : "sayhi",
	active : true
};

var rootEntity = {
	id : -1, displayname:"[Root]", username : "root", shhh : '', roles : ["lilium"],
}

var defaultServerConfiguration = require('../config.js');
var log = require('../log.js');

var initMongo = function(db, cb) {
	log('Database', 'Init script was executed');
	var totalTasks = 9;
	var completedTasks = 0;

	// Boot Script
	var _run = function() {
		createCol(0);
	};

	// Create documents
	var colLength = mongoDocuments.names.length;
	var createCol = function(i) {
		if (i == colLength) {
			fillCols();
		} else {
			db.createCollection(
				mongoDocuments.names[i],
				{},
				function(err) {
					// Prevents stacking calls
					if (!err) {
						log("Database", "Created collection " + mongoDocuments.names[i]);
						setTimeout(function() {
							createCol(i+1);
						}, 0);
					} else {
						throw "[DatabaseInit - Could not create collection : "+mongoDocuments.names[i]+"]";
					}
				}
			);
		}
	};

	var fillCols = function() {
		// Load configuration in database
		log('Database', 'Inserting default configuration');
		db.collection('config', {strict:true}, function(err, col) {
			if (!err) {
				col.insertOne(defaultServerConfiguration, function(err, r) {
					completedTasks++;
					checkForCompletion();
				});
			} else {
				throw "[DatabaseInit - config collection does not exist]";
			}
		});

		log('Database', 'Inserting default content type');
		db.collection('types', {strict:true}, function(err, col) {
			if (!err) {
				col.insertOne(typesDefaultStructure, function(err, r) {
					completedTasks++;
					checkForCompletion();
				});
			} else {
				throw "[DatabaseInit - types collection does not exist]";
			}
		});

		log('Database', 'Creating admin and root access');
		db.collection('entities', {strict:true}, function(err, col) {
			if (!err) {
				col.insertMany([adminEntity, rootEntity], function(err, r) {
					completedTasks++;
					checkForCompletion();
				});
			} else {
				throw "[DatabaseInit - entities collection does not exist]";
			}
		});

		log('Database', 'Creating default plugin entries');
		db.collection('plugins', {strict:true}, function(err, col) {
			if (!err) {
				col.insertMany([defaultPlugin], function(err, r) {
					completedTasks++;
					checkForCompletion();
				});
			} else {
				throw "[DatabaseInit - plugins collection does not exist]";
			}
		});

		log('Database', 'Creating default theme entry');
		db.collection('themes', {strict:true}, function(err, col) {
			if (!err) {
				col.insertOne(defaultTheme, function(err, r) {
					completedTasks++;
					checkForCompletion();
				});
			} else {
				throw "[DatabaseInit - themes collection does not exist]";
			}
		});

		log('Database', 'Creating default product types entries');
		db.collection('producttypes', {strict:true}, function(err, col) {
			if (!err) {
				col.insertMany(defaultProductTypes, function(err, r) {
					completedTasks++;
					checkForCompletion();
				});
			} else {
				throw "[DatabaseInit - plugins collection does not exist]";
			}
		});

		log('Database', 'Creating default product price bases entries');
		db.collection('productpricebases', {strict:true}, function(err, col) {
			if (!err) {
				col.insertMany(defaultPriceBases, function(err, r) {
					completedTasks++;
					checkForCompletion();
				});
			} else {
				throw "[DatabaseInit - plugins collection does not exist]";
			}
		});

		log('Database', 'Creating default products entries');
		db.collection('products', {strict:true}, function(err, col) {
			if (!err) {
				col.insertMany(defaultProducts, function(err, r) {
					completedTasks++;
					checkForCompletion();
				});
			} else {
				throw "[DatabaseInit - plugins collection does not exist]";
			}
		});

		log('Database', 'Creating default Campaigns Statuses');
		db.collection('campaignStatuses', {strict:true}, function(err, col) {
			if (!err) {
				col.insertMany(defaultCampaignStatuses, function(err, r) {
					completedTasks++;
					checkForCompletion();
				});
			} else {
				throw "[DatabaseInit - campaignStatuses collection does not exist]";
			}
		});
	};

	var checkForCompletion = function() {
		if (completedTasks == totalTasks) {
			log('Database', 'Database initialization completed');
			db.close();

			cb(true);
		}
	};

	_run();
};

module.exports = function(dbtype, db, cb) {
	if (dbtype == 'mongodb') {
		initMongo(db, cb);
	};
};
