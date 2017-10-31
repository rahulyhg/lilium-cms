/*  
    dbinit.js
    Lilium Database initialization 
    
    Creates all required collections in MongoDB for Lilium to run.
*/
var log = require('../log.js');

var mongoDocuments = {
	names : [
		"entities", "roles", "plugins", "themes", "config", "compiledfiles", "preview",
		"sites", "discussions", "types", "vocab", "content", "sessions", "dfpcache", "styledpages",
		"lilium", "uploads", "cachedFiles", "dfp", "personas", "secrets", "conversations",
		"messages", "notifications", "categories", "autosave", "userbadges", "teambadges"
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
	{name:"clisign", displayName:"Pending Client Signature"},
	{name:"clipayment", displayName:"Pending Client Payment"},
	{name:"prod", displayName:"Production"},
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

var basicRoles = [
    {name : "author", displayname : "Author", power : 5000, pluginID : false, rights : [
        "dash", "publish", "preferences", "upload", "list-uploads"
    ]},
    {name : "editor", displayname : "Editor", power : 4500, pluginID : false, rights : [
        "dash", "publish", "preferences", "upload", "list-uploads", 
        "list-all-articles", "list-entities", "create-entities", "edit-all-articles",
        "destroy-articles", "user_management"
    ]}
];

var rootEntity = {
	id : -1, displayname:"[Root]", username : "root", shhh : '', roles : ["lilium"],
}

var userBadgesRank = [
  {
    "code": "artist",
    "condition": "Published x articles",
    "name": "Artist",
    "ranks": [10,50,100,500,1000,5000,10000,25000],
    "icon": "f1d9"
  },
  {
    "code": "creator",
    "condition": "Created x users",
    "name": "Creator",
    "ranks": [1,5,10,50,100,150,500,800],
    "icon": "f0c0"
  },
  {
    "code": "editor",
    "condition": "Edited an article x times",
    "name": "Editor",
    "ranks": [50,250,1000,2000,10000,50000,100000,500000],
    "icon": "f040"
  },
  {
    "code": "mvp",
    "condition": "Logged in x times",
    "name": "MVP",
    "ranks": [1,25,80,200,500,1000,5000,10000],
    "icon": "f090"
  },
  {
    "code": "uploader",
    "condition": "Uploaded x images",
    "name": "Uploader",
    "ranks": [25,250,680,1250,2500,5000,10000,50000],
    "icon": "f083"
  },
  {
    "code": "grownup",
    "condition": "Wrote x NSFW articles",
    "name": "Grownup",
    "ranks": [1,3,10,25,50,100,500,1000],
    "icon": "f228"
  },
  {
    "code": "lys",
    "condition": "Used x Lys commands",
    "name": "Lys Best Friend",
    "ranks": [50,350,1000,2500,5000,10000,100000,1000000],
    "icon": "f06c"
  },
  {
    "code": "undoer",
    "condition": "Unpublished x articles",
    "name": "Undoer",
    "ranks": [5,25,50,100,450,1500,5000,10000],
    "icon": "f0e2"
  },
  {
    "code": "lifesaver",
    "condition": "Reported x issues",
    "name": "Lifesaver",
    "ranks": [1,3,10,50,80,150,300,1000],
    "icon": "f1cd"
  },
  {
    "code": "security",
    "condition": "Changed password x times",
    "name": "Security Wizard",
    "ranks": [1,3,10,25,50,75,250,500],
    "icon": "f023"
  },
  {
    "code": "analyst",
    "condition": "Loaded dashboard x times",
    "name": "Analyst",
    "ranks": [50,500,5000,10000,50000,100000,1000000,5000000],
    "icon": "f200"
  },
  {
    "code": "detective",
    "condition": "Sent x search queries",
    "name": "Detective",
    "ranks": [5,50,250,750,2500,5000,25000,100000],
    "icon": "f002"
  }
];

var teamBadgesRank = [
  {
    "code": "viral",
    "condition": "x readers real-time",
    "name": "Viral",
    "ranks": [500,1000,2000,3500,5000,10000,15000,25000],
    "icon": "f02d"
  },
  {
    "code": "content",
    "condition": "x articles published",
    "name": "Content Creators",
    "ranks": [100,500,1000,5000,10000,50000,100000,500000],
    "icon": "f1d8"
  },
  {
    "code": "dreamteam",
    "condition": "x writers onboard",
    "name": "Dream Team",
    "ranks": [5,10,15,20,25,30,40,50],
    "icon": "f25b"
  }
];

var badgeLevels = [
    "Green",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond", 
    "Rainbow",
    "Master"
];


var initMongo = function(conf, db, cb) {
	log('Database', 'Init script was executed');
	var totalTasks = 7;
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

        log('Database', 'Inserting all badge data in 3 collections');
        db.collection('userbadges', {strict:true}, function(err, col) {
            if (!err) {
                col.insertMany(userBadgesRank, function(err, r) {
                    completedTasks++;
                    checkForCompletion();
                });
            } else {
                throw "[DatabaseInit - userbadges collection does not exist]";
            }
        });

        db.collection('teambadges', {strict:true}, function(err, col) {
            if (!err) {
                col.insertMany(teamBadgesRank, function(err, r) {
                    completedTasks++;
                    checkForCompletion();
                });
            } else {
                throw "[DatabaseInit - teambadges collection does not exist]";
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
