var mongoDocuments = {
	names : [
		"entities", "roles", "plugins", "themes", "config", 
		"sites", "discussions", "types", "vocab", "content",
		"lilium"
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
	website : 'http://liliumcsm.com/themes/flowerg',
	requiredModule : []
};

var rootEntity = {
	id : -1, username : "root", shhh : '', roles : ["lilium"],
}

var defaultServerConfiguration = require('../config.js');
var log = require('../log.js');

var initMongo = function(db, cb) {
	log('Database', 'Init script was executed');
	var totalTasks = 4;
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
