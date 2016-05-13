var mongoDocuments = {
	names : [
		"entities", "roles", "plugins", "themes", "config", "compiledfiles",
		"sites", "discussions", "types", "vocab", "content", "sessions", "dfpcache",
		"lilium", "uploads", "cachedFiles", "campaigns", "products", "dfp",
		"producttypes", "productpricebases", "changerequests", "campaignStatuses", "notifications",
		"categories", "autosave"
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
	{name:"display",displayName:"Display"},
	{name:"email",displayName:"Email"},
	{name:"sponsedit",displayName:"Sponsored Editorial"},
	{name:"twitter",displayName:"Twitter"},
	{name:"instagram",displayName:"Instagram"},
	{name:"facebook",displayName:"Facebook"},
	{name:"snapchat",displayName:"Snapchat"},
	{name:"video",displayName:"Video"},
	{name:"netdisc",displayName:"Network Discovery"},
	{name:"other",displayName:"Other"}
];

var defaultPriceBases = [
	{name:"unit",displayName:"Unit",divider:1},
	{name:"cpm",displayName:"CPM",divider:1000},
	{name:"cpc",displayName:"CPC",divider:1},
	{name:"cpv",displayName:"CPV",divider:1}
];

var defaultProducts = [
    { "name":"dp-bb", "displayName":"Display - Big box (300x250)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-bbm", "displayName":"Display - Big box mobile (300x250)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-bi", "displayName":"Display - Billboard (970x250)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-ct", "displayName":"Display - Companion Takeover", "productType":"display", "priceBase":"unit", "price":500, "active":true, "SKU":"-" },
    { "name":"dp-ls", "displayName":"Display - Large Skyscraper (300x600)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-lb", "displayName":"Display - Leaderboard (728x90)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-sk", "displayName":"Display - Skin", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-ss", "displayName":"Display - Skyscraper (160x600)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"email", "displayName":"Email Discovery", "productType":"email", "priceBase":"unit", "price":500, "active":true, "SKU":"-" },
    { "name":"fb", "displayName":"Facebook", "productType":"facebook", "priceBase":"cpm", "price":0.008, "active":true, "SKU":"-" },
    { "name":"ig", "displayName":"Instagram", "productType":"instagram", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"igo", "displayName":"Organic Instagram", "productType":"instagram", "priceBase":"unit", "price":500, "active":true, "SKU":"-" },
    { "name":"fbo", "displayName":"Organic Facebook", "productType":"facebook", "priceBase":"unit", "price":500, "active":true, "SKU":"-" },
    { "name":"two", "displayName":"Organic Twitter", "productType":"twitter", "priceBase":"unit", "price":200, "active":true, "SKU":"-" },
    { "name":"snapstory", "displayName":"Snapchat Story", "productType":"snapchat", "priceBase":"unit", "price":1000, "active":true, "SKU":"-" },
    { "name":"sponsedbas", "displayName":"Sponsored editorial - BASIC", "productType":"sponsedit", "priceBase":"unit", "price":750, "active":true, "SKU":"-" },
    { "name":"sponsedstand", "displayName":"Sponsored editorial - STANDARD", "productType":"sponsedit", "priceBase":"unit", "price":1500, "active":true, "SKU":"-" },
    { "name":"sponsedrev", "displayName":"Sponsored editorial revision", "productType":"other", "priceBase":"unit", "price":120, "active":true, "SKU":"-" },
    { "name":"sponsvid", "displayName":"Sponsored video", "productType":"video", "priceBase":"unit", "price":4000, "active":true, "SKU":"-" },
    { "name":"tw", "displayName":"Twitter", "productType":"twitter", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-vad", "displayName":"Display - Video In-Content Ad", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-nad", "displayName":"Display - Native ad", "productType":"netdisc", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" }
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

var rootEntity = {
	id : -1, displayname:"[Root]", username : "root", shhh : '', roles : ["lilium"],
}

var log = require('../log.js');

var initMongo = function(conf, db, cb) {
	log('Database', 'Init script was executed');
	var totalTasks = 8;
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
				col.insertOne(conf, function(err, r) {
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

		genIndexes();
	};

	var checkForCompletion = function() {
		if (completedTasks == totalTasks) {
			log('Database', 'Database initialization completed');
			db.close();

			cb(true);
		}
	};

	var genIndexes = function(cb) {
		db.createIndex('content', {title : "text"}, function() {
			log('Database', 'Created Index for content');
		});
	}

	_run();
};

module.exports = function(conf, db, cb) {
	initMongo(conf, db, cb);
};
