var _c = require('../config.js');
var log = require('../log.js');
var MongoClient = require('mongodb').MongoClient

var _conn = undefined;

var DB = function() {
	// Will return undefined if everything went well, or an err if it crashes
	this.testConnection = function(callback) {
		log('Database', 'Testing connection to mongo database');
		MongoClient.connect(formatMongoString(), function(err, db) {
			log('Database', 'Test at ' + _c.default.data.host + ":" + _c.default.data.port); 
			if (!err) {
				log('Database', 'Firing successful test signal');
				db.close(false, function() {
					callback(undefined);
				});
			} else {
				log('Database', 'Failed to connect : ' + err);
				callback(err);
			}

			return;
		});
	};	

	this.createDatabase = function(callback) {
		log('Database', 'Initializing database');
		MongoClient.connect(formatMongoString(), function(err, db) {
			if (err) {
				log('Database', 'Error accessing database : ' + err);
				callback(false);
			} else {
				callback(true);
			}
		});
	};

	this.initDatabase = function(callback) {
		MongoClient.connect(formatMongoString(), function(err, db) {
			db.collection('lilium', {strict:true}, function(err, c) {
				if (err) {
					require('./dbinit.js')(_c.default.data.engine, db, callback);
				} else {
					callback(false);
				}
			});
		});
	};

	this.createPool = function(callback) {
		log('Database', 'Creating database global connection object');
		MongoClient.connect(formatMongoString(), function(err, conn) {
			_conn = conn;
			callback(!err);
		});
	};

	var formatMongoString = function() {
		return 'mongodb://' + _c.default.data.host + ":" + _c.default.data.port + "/" + _c.default.data.use;
	}

	var init = function() {
	
	};
};

module.exports = new DB();
