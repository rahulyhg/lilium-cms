var _c = require('../lib/config');

const metrics = require('../lib/metrics');
const MongoClient = require('mongodb').MongoClient
const mongoObjectID = require('mongodb').ObjectID;
const noop = () => {};

let _conn = undefined;
let _conns = {};


const formatMongoString = conf => 'mongodb://' + conf.data.user + ":" + conf.data.pass + "@" + conf.data.host + ":" + conf.data.port + "/" + conf.data.use;

class DB {
	// Will return undefined if everything went well, or an err if it crashes
	testConnection(conf, callback){
		log('Database', 'Testing connection to mongo database');
		MongoClient.connect(formatMongoString(conf), { useNewUrlParser: true }, (err, db) => {
			log('Database', 'Test at ' + conf.data.host + ":" + conf.data.port);
			if (!err) {
				log('Database', 'Firing successful test signal');
				db.close(false, () => {
					callback(undefined);
				});
			} else {
				log('Database', 'Failed to connect : ' + err);
				callback(err);
			}

			return;
		});
	};

	testConnectionFromParams(host, port, user, pass, name, cb, dbtype){
        if (!dbtype || dbtype === 'mongo') {
		    var mongoString = "mongodb://" + user + ":" + pass + "@" + host + ":" + port + "/" + name;
	    	log('Database', 'Testing : ' + mongoString);
    		MongoClient.connect(mongoString, { useNewUrlParser: true }, (err, tempConn) => {
			    if (err) {
		    		cb(false, err);
	    		} else {
    				tempConn.close(false, () => {
					    cb(true);
				    });
			    }
		    });
        } else {
            cb(false);
        }
	};

	createDatabase(conf, callback){
		log('Database', 'Initializing database');
		MongoClient.connect(formatMongoString(conf), { useNewUrlParser: true }, (err, db) => {
			if (err) {
				log('Database', 'Error accessing database : ' + err);
				callback(false);
			} else {
				callback(true);
			}
		});
	};

	initDatabase(conf, callback){
		MongoClient.connect(formatMongoString(conf), { useNewUrlParser: true }, (err, client) => {
            if (!client || err) {
                log('Database', 'Could not connect to database.', 'err');
                require('../network/localcast').fatal(new Error("Could not connect to database"));
                return;
            }
			client.db(conf.data.use).collection('lilium', {}, (err, c) => {
				if (err) {
					require('../includes/dbinit.js')(conf, client.db(conf.data.use), callback);
				} else {
					callback(false);
				}
			});
		});
	};

	createPool(conf, callback){
		log('Database', 'Creating database global connection object');
		MongoClient.connect(formatMongoString(conf), { useNewUrlParser: true }, (err, conn) => {
			_conns[conf.id || conf] = conn.db(conf.data.use);
			callback(!err);
		});
	};

    createCollection(_, __, done) {
        log('Database', '[DEPRECATED] A call to createCollection wad made, but the method is deprecated', 'warn');
        done && done();
    }


	/*
		coln : Collection name
		conds : Query object for matching with format : {key:value}
		stack : An array of query functions to call with format :
		[
			"functionName" : [params]
		]
		cb : End callback with format (err, cursor) =>
	*/
	query() { return this.find(...arguments); }
	find(conf, coln, conds, stack, cb, proj){
        metrics.plus('dbcalls');
		_conns[conf.id || conf].collection(coln, {}, (err, col) => {
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

    all(cur, looper, done, threadCount){
        threadCount = threadCount || 1;

        var handleNext = () => {
            cur.hasNext((err, hasnext) => {
                if (hasnext) {
                    cur.next((err, obj) => {
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

	findSingle() { return this.findUnique(...arguments); }
    findUnique(conf, coln, conds, cb, proj){
        metrics.plus('dbcalls');
        _conns[conf.id || conf].collection(coln, {}, (err, col) => { 
            var cur = col.find(conds).limit(1).project(proj);
            cur.hasNext((err, hasnext) => {
                hasnext ? cur.next(cb) : cb(new Error("Could not find item in collection " + coln), undefined);
            });
        });
    }

    count(conf, coln, conds, cb){
        metrics.plus('dbcalls');
        _conns[conf.id || conf].collection(coln, {}, (err, col) => {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
                col.find(conds).count((err, count) => {
                    cb(err, count);
                });
            }
        });
    };
	
	isValidMongoID(id) { return mongoObjectID.isValid(id); }

	mongoID(str) {
		try {
			return new mongoObjectID(str);
		} catch (err) {
			return;
		}
	};

	findToArray(conf, coln, conds, cb, projection, skip, max, fromLastToFirst){
        metrics.plus('dbcalls');
		_conns[conf.id || conf].collection(coln, {}, (err, col) => {
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

                stk.toArray((err, arr) => {
					cb(err, arr);
				});
			}
		});
	};

	multiLevelFind(conf, topLevel, levels, conds, stack, callback){
        metrics.plus('dbcalls');
		var firstNodeCond = levels.shift();
		this.find(conf, topLevel, conds, stack, (err, cur) => {
			cur.hasNext((err, hasNext) => {
				if (hasNext) {
					cur.next((err, r) => {
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

	singleLevelFind(conf, topLevel, callback){
        metrics.plus('dbcalls');
		this.find(conf, topLevel, {}, {}, (err, cur) => {
			err ? callback(err) : cur.toArray((err, docs) => {
				callback(docs);
			});
		});
	};

    save(conf, coln, doc, cb){
        metrics.plus('dbcalls');
        _conns[conf.id || conf].collection(coln, {}, (err, col) => {
			if (err) {
				cb("[Database - Error : "+err+"]");
            } else if (!doc || !doc._id) {
                cb("[Database - Error : No document _id specified]");
			} else {
                coln.updateOne({_id : doc._id}, doc, (err, r) => { cb || cb(err, r); });
            }
        });
    }

	// Will find documents from collection coln according to conds,
	// Modify all all entries for newVal,
	// And call the cb callback with format (err, result) =>
	modify() { return this.update(...arguments); }
	update(conf, coln, conds, newVal, cb, upsert, one, operators, getDoc){
        metrics.plus('dbcalls');
        _conns[conf.id || conf].collection(coln, {}, (err, col) => {
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
					).then((r) => {
						cb && cb(undefined, r);
					}).catch((err) => {
                        cb && cb(err);
                    });
				}
			}
		});
	};

    increment(conf, coln, match, fields, done){
        metrics.plus('dbcalls');
        _conns[conf.id].collection(coln, {}, (err, col) => {
            col.updateOne(match, {$inc : fields}).then(done || noop).catch(done || noop);
        });
    }

	createIndex(conf, coln, fields, cb, params = {}) {
        log("Database", "Creating index for collection " + coln + "@" + (conf.id || conf));
		_conns[conf.id || conf].collection(coln, {}, (err, col) => {
			col.createIndex(fields, params, (err, results) => {
				cb(err, results);
			});
		});
	}

	findAndModify(conf, coln, conds, newVal, cb, upsert, one){
        metrics.plus('dbcalls');
		_conns[conf.id || conf].collection(coln, {}, (err, col) => {
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
					).then((doc) => {
						cb(undefined, doc);
					});
				}
			}
		});
	}

	insert(conf, coln, docs, cb){
        metrics.plus('dbcalls');
		_conns[conf.id || conf].collection(coln, {}, (err, col) => {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof docs !== "object") {
				cb("[Database - Invalid document]");
			} else {
                Array.isArray(docs) ? docs.length ? col.insertMany(docs, cb) : cb(new Error("Tried to insert empty array")) : col.insertOne(docs, cb);
			}
		});
	};

	remove(conf, coln, conds, cb, one){
        metrics.plus('dbcalls');
		_conns[conf.id || conf].collection(coln, {}, (err, col) => {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else if (typeof conds != "object") {
				cb("[Database - Invalid document]");
			} else {
				col[one ? 'deleteOne' : 'deleteMany'](
					conds,
                    {},
                    (err, r) => {
					    cb(err, r);
				    }
                );
			}
		});
	};

	join() { return this.aggregate(...arguments); }
	aggregate(conf, coln, aggregation, cb, unique){
        metrics.plus('dbcalls');
		_conns[conf.id || conf].collection(coln, {}, (err, col) => {
			if (err) {
				cb("[Database - Error : "+err+"]");
			} else {
				if (typeof aggregation === 'undefined') {
					cb("[Database - Aggregate requires an aggregation.]");
				} else {
					col.aggregate(
						aggregation
					)[unique ? "next" : "toArray"]((err, result) => {
				       cb(err || result);
				   });
				}
			}
		});
	}

    networkJoin(coln, aggregation, cb, unique){
        const sites = require(liliumroot + "/lib/config").getAllSites();
        let siteIndex = -1;
        let resp = [];
        let resps = {};

        const nextSite = () => {
            if (++siteIndex == sites.length) {
                return cb(resp, resps);
            }

            this.join(sites[siteIndex], coln, aggregation, arr => {
                resps[sites[siteIndex].id] = arr;
                resp = [...resp, ...arr];
                nextSite();
            }, unique);
        };

        nextSite();
    };

	// Will callback cb with a boolean representing the existance of a document
	match() { return this.exists(...arguments); }
	exists(conf, coln, conds, cb){
        metrics.plus('dbcalls');
        _conns[conf.id || conf].collection(coln, {}, (err, col) => {
            col.find(conds).limit(1).hasNext((err, hasnext) => {
                cb(hasnext);
            });
		});
	};

    // Params accepted properties :
    // selector :   Mongo selector
    // limit :      Maximum number of output
    // toArray :    flag to return an array of all returned objects
    // iterator :   function called on each object with (object, next, cursor)
    //              Calling next(false) will break the loop
    paramQuery(conf, params, cb){
        metrics.plus('dbcalls');
		_conns[conf.id || conf].collection(coln, params.colparam || {}, (err, col) => {
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
                    q.toArray((err, arr) => {
                        cb(err || arr);
                    });
                } else if (params.iterator) {
                    var next = (check) => {
                        if (check === false) {
                            cb();
                        } else {
                            q.hasNext((err, has) => {
                                if (has) {
                                    q.next((err, o) => {
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
    // Will not compute metric
	rawCollection(conf, coln, opt, cb){
		_conns[conf.id || conf].collection(coln, opt, cb);
	};
};

module.exports = new DB();
