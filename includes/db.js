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

	/*
		coln : Collection name
		conds : Query object for matching with format : {key:value}
		stack : An array of query functions to call with format : 
		[
			"functionName" : [params]
		]
		cb : End callback with format function(err, cursor)
	*/
	this.find = this.query = function(coln, conds, stack, cb) {
		db.collection(coln, {"strict":true}, function(err, col) {	
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
				stack = typeof stack === 'undefined' ? [] : stack;
				conds = typeof conds === 'undefined' ? {} : conds;

				var cursor = col.find(conds);
				if (typeof stack === 'object') {
					for (var key in stack) {
						if (typeof cursor[key] === 'function') {
							cursor = cursor[key].apply(cursor, stack[key]);
						}
					}
				}

				cb(undefined, cursor);
			} 
		});	
	};

	// Will find documents from collection coln according to conds, 
	// Modify all all entries for newVal,
	// And call the cb callback with format function(err, result)
	this.modify = this.update = function(coln, conds, newVal, cb, upsert, one) {	
		db.collection(coln, {"strict":true}, function(err, col) {	
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
				conds = typeof conds === 'undefined' ? {} : conds;
				if (typeof newVal !== 'object') {
					cb('[Database - Invalid mod values]');
				} else {
					col[one ? 'updateOne' : 'updateMany'](
						conds,
						{$set:newVal},
						{
							'upsert' : upsert ? upsert : false
						}
					).then(function(r) {
						cb(undefined, r);
					});
				}
			} 
		});	
		
	};

	this.insert = function(coln, docs, cb) {
		db.collection(coln, {"strict":true}, function(err, col) {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof docs !== "object") {
				cb("[Database - Invalid document]");
			} else {
				col[typeof docs.length !== "undefined" ? "insertMany" : "insertOne"](
					docs, function(err, r) {
						cb(err, r);
					}
					); 
			}
		});
	};

	this.remove = this.delete = function(coln, conds, cb, one) {	
		db.collection(coln, {"strict":true}, function(err, col) {	
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
				if (typeof conds === 'undefined') {
					cb("[Database - Deleting requires a filter. Use the empty function to clear an entire collection]");
				} else {
					col[one ? 'deleteOne' : 'deleteMany'](
						conds
					).then(function(r) {
						cb(undefined, r);
					});
				}
			} 
		});	
	};

	// Will callback cb with a boolean representing the existance of a document
	this.match = this.exists = function(coln, conds, cb) {
		db.collection(coln, {"strict":true}, function(err, col) {
			
		});
	};
		
	// USE CAREFULLY
	// Will callback cb with a raw mongodb collection object
	this.rawCollection = function(coln, opt, cb) {
		db.collection(coln, opt, cb);
	};
};

module.exports = new DB();
