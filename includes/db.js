var _c = require('../config.js');
var log = require('../log.js');
var MongoClient = require('mongodb').MongoClient
var mongoObjectID = require('mongodb').ObjectID;
var mysql = require('mysql');

var _conn = undefined;
var _conns = new Object();

var DB = function() {
	// Will return undefined if everything went well, or an err if it crashes
	this.testConnection = function(conf, callback) {
		log('Database', 'Testing connection to mongo database');
		MongoClient.connect(formatMongoString(conf), function(err, db) {
			log('Database', 'Test at ' + conf.data.host + ":" + conf.data.port);
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

	this.testConnectionFromParams = function(host, port, user, pass, name, cb, dbtype) {
        if (!dbtype || dbtype === 'mongo') {
		    var mongoString = "mongodb://" + user + ":" + pass + "@" + host + ":" + port + "/" + name;
	    	log('Database', 'Testing : ' + mongoString);
    		MongoClient.connect(mongoString, function(err, tempConn) {
			    if (err) {
		    		cb(false, err);
	    		} else {
    				tempConn.close(false, function() {
					    cb(true);
				    });
			    }
		    });
        } else if (dbtype === 'mysql') {
            log('Database', 'Testing mySQL connection @ ' + host);
            var connection = mysql.createConnection({
                host: host,
                port: port,
                user: user,
                password: pass
            });

            connection.connect(function(err) {
                log('Database', 'Test ' + (err ? "failed" : "passed"));
                if (err) {
                    log('Database', 'MySQL error ' + err);
                }

                cb(!err);
            });
        } else {
            cb(false);
        }
	};

	this.createDatabase = function(conf, callback) {
		log('Database', 'Initializing database');
		MongoClient.connect(formatMongoString(conf), function(err, db) {
			if (err) {
				log('Database', 'Error accessing database : ' + err);
				callback(false);
			} else {
				callback(true);
			}
		});
	};

	this.createCollection = this.createCollections = function(conf, col, callback) {
        if (typeof col === 'object') {
            var colIndex = 0;
            var colMax = col.length;
            var results = { err : [], res : [] };

            var ins = function() {
                if (colIndex < colMax) {
		            _conns[conf.id || conf].createCollection(col[colIndex], {}, function(err, res) {
                        err && results.err.push(err);
                        res && results.res.push(res);
                        colIndex++;
                        
                        ins();
                    });
                } else {
                    log('Database', 'Created ' + results.res.length + ' collections with ' + results.err.length + ' errors', 'lilium');
                    callback && callback();
                }
            };

            ins();
        } else {
		    _conns[conf.id || conf].createCollection(col, {}, callback);
        }
	};

	this.initDatabase = function(conf, callback) {
		MongoClient.connect(formatMongoString(conf), function(err, db) {
			db.collection('lilium', {strict:true}, function(err, c) {
				if (err) {
					require('./dbinit.js')(conf, db, callback);
				} else {
					callback(false);
				}
			});
		});
	};

	this.createPool = function(conf, callback) {
		log('Database', 'Creating database global connection object');
		MongoClient.connect(formatMongoString(conf), function(err, conn) {
			_conns[conf.id || conf] = conn;
			callback(!err);
		});
	};

	var formatMongoString = function(conf) {
		return 'mongodb://' + conf.data.user + ":" + conf.data.pass + "@" +
			conf.data.host + ":" + conf.data.port + "/" + conf.data.use;
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
	this.find = this.query = function(conf, coln, conds, stack, cb, proj) {
		_conns[conf.id || conf].collection(coln, {"strict":true}, function(err, col) {
			if (err) {
                log('Database', 'Error querying collection ' + coln + ' : ' + err, 'err');
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
				stack = typeof stack === 'undefined' ? [] : stack;
				conds = typeof conds === 'undefined' ? {} : conds;

				var cursor = col.find(conds, proj);
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

    this.all = function(cur, looper, done, threadCount) {
        threadCount = threadCount || 1;

        var handleNext = function() {
            cur.hasNext(function(err, hasnext) {
                if (hasnext) {
                    cur.next(function(err, obj) {
                        if (err) {
                            done(iterations, err);
                        } else {
                            iterations++;
                            looper(obj, handleNext);
                        }
                    });
                } else if (err) {
                    done(iterations, err);
                } else {
                    done(iterations);
                }
            });
        };

        iterations = 0;

        for (var i = 0; i < threadCount; i++) {
            handleNext();
        }
    };

    this.findUnique = this.findSingle = function(conf, coln, conds, cb, proj) {
        this.find(conf, coln, conds, undefined, function(err, cur) {
            cur.hasNext(function(err, hasnext) {
                hasnext ? cur.next(cb) : cb(new Error("Could not find item in collection " + coln), undefined);
            });
        }, proj);
    }

    this.count = this.length = function(conf, coln, conds, cb) {
        _conns[conf.id || conf].collection(coln, {strict:true}, function(err, col) {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
                col.find(conds).count(function(err, count) {
                    cb(err, count);
                });
            }
        });
    };
    
	this.mongoID = function(str) {
		try {
			return new mongoObjectID(str);
		} catch (err) {
			return;
		}
	};

	this.findToArray = function(conf, coln, conds, cb, projection, skip, max, fromLastToFirst) {
		_conns[conf.id || conf].collection(coln, {"strict":true}, function(err, col) {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
				conds = typeof conds === 'undefined' ? {} : conds;
				var stk = col.find(conds);

                if (fromLastToFirst) {
                    stk = stk.sort({_id : -1});
                }

                if (projection) {
                    stk = stk.project(projection);
                }

                if (typeof skip == "number") {
                    stk = stk.skip(skip);
                }

                if (typeof max == "number") {
                    stk = stk.limit(max);
                }

                stk.toArray(function(err, arr) {
					cb(err, arr);
				});
			}
		});
	};

	this.multiLevelFind = function(conf, topLevel, levels, conds, stack, callback) {
		var firstNodeCond = levels.shift();
		this.find(conf, topLevel, conds, stack, function(err, cur) {
			cur.hasNext(function(err, hasNext) {
				if (hasNext) {
					cur.next(function(err, r) {
						for (var i = 0, len = levels.length; i < len; i++) {
							if (typeof r !== 'undefined') {
								r = r[levels.shift()];
							} else {
								r = new Object();
							}
						}

						callback([r]);
					});
				} else {
					callback(undefined);
				}
			});
		});
	};

	this.singleLevelFind = function(conf, topLevel, callback) {
		this.find(conf, topLevel, {}, {}, function(err, cur) {
			err ? callback(err) : cur.toArray(function(err, docs) {
				callback(docs);
			});
		});
	};



	// Will find documents from collection coln according to conds,
	// Modify all all entries for newVal,
	// And call the cb callback with format function(err, result)
	this.modify = this.update = function(conf, coln, conds, newVal, cb, upsert, one, operators, getDoc) {
        _conns[conf.id || conf].collection(coln, {"strict":true}, function(err, col) {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
				conds = typeof conds === 'undefined' ? {} : conds;
				if (typeof newVal !== 'object') {
					cb('[Database - Invalid mod values]');
				} else {
					col[
                        getDoc ? (one ? 'findOneAndUpdate' : 'findManyAndUpdate')
                               : (one ? 'updateOne' : 'updateMany')
                    ](
						conds,
						operators ? newVal : {$set:newVal},
						{
							'upsert' : upsert ? upsert : false
						}
					).then(function(r) {
						cb && cb(undefined, r);
					});
				}
			}
		});

	};

	this.createIndex = function(conf, coln, fields, cb) {
		_conns[conf.id || conf].collection(coln, {"strict":true}, function(err, col) {
			col.createIndex(fields, {}, function(err, results) {
				cb(err, results);
			});
		});
	}

	this.findAndModify = function(conf, coln, conds, newVal, cb, upsert, one) {
		_conns[conf.id || conf].collection(coln, {"strict":true}, function(err, col) {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
				conds = typeof conds === 'undefined' ? {} : conds;
				if (typeof newVal !== 'object') {
					cb('[Database - Invalid mod values]');
				} else {
					col.findAndModify(
						conds,
						[['_id','asc']],
						{$set:newVal},
						{
							'upsert' : upsert ? upsert : false,
							$limit : 1
						}
					).then(function(doc) {
						cb(undefined, doc);
					});
				}
			}
		});
	}

	this.insert = function(conf, coln, docs, cb) {
		_conns[conf.id || conf].collection(coln, {"strict":true}, function(err, col) {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof docs !== "object") {
				cb("[Database - Invalid document]");
			} else {
				col[Array.isArray(docs) ? "insertMany" : "insertOne"](docs, cb);
			}
		});
	};

	this.remove = this.delete = function(conf, coln, conds, cb, one) {
		_conns[conf.id || conf].collection(coln, {"strict":true}, function(err, col) {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
				col[one ? 'deleteOne' : 'deleteMany'](
					conds,
                    {},
                    function(err, r) {
					    cb(err, r);
				    }
                );
			}
		});
	};

	this.aggregate = this.join = function(conf, coln, aggregation, cb) {
		_conns[conf.id || conf].collection(coln, {"strict":true}, function(err, col) {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else {
				if (typeof aggregation === 'undefined') {
					cb("[Database - Aggregate requires an aggregation.]");
				} else {
					col.aggregate(
						aggregation
					).toArray(function(err, result) {
				       cb(err || result);
				   });
				}
			}
		});
	}

	// Will callback cb with a boolean representing the existance of a document
	this.match = this.exists = function(conf, coln, conds, cb) {
		this.find(conf, coln, conds, {limit:[1]}, function(err, r) {
				if (err) {
				cb(false);
			} else {
				r.hasNext(function(err, res) {
					cb(err ? false : res);
				});
			};
		});
	};

    // Params accepted properties :
    // selector :   Mongo selector
    // limit :      Maximum number of output
    // toArray :    flag to return an array of all returned objects
    // iterator :   function called on each object with (object, next, cursor)
    //              Calling next(false) will break the loop
    this.paramQuery = function(conf, params, cb) {
		_conns[conf.id || conf].collection(coln, params.colparam || {"strict":true}, function(err, col) {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
                var q = col.find(params.selector || {});
                if (params.limit) {
                    q = q.limit(params.limit);
                }

                if (params.toArray) {
                    q.toArray(function(err, arr) {
                        cb(err || arr);
                    });
                } else if (params.iterator) {
                    var next = function(check) {
                        if (check === false) {
                            cb();
                        } else {
                            q.hasNext(function(err, has) {
                                if (has) {
                                    q.next(function(err, o) {
                                        var check = params.iterator(o, next, q);
                                    });
                                } else {
                                    cb();
                                }
                            });
                        }
                    };
                    next(true);
                } else {
                    cb(q);
                }
            }
        });
    };

	// USE CAREFULLY
	// Will callback cb with a raw mongodb collection object
	this.rawCollection = function(conf, coln, opt, cb) {
		_conns[conf.id || conf].collection(coln, opt, cb);
	};
};

module.exports = new DB();
