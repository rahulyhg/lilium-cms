var MongoClient = require('mongodb').MongoClient
var mongoObjectID = require('mongodb').ObjectID;

const dbs = {};

class Database {
    static formatMongoString(conf) {
		return 'mongodb://' + conf.data.user + ":" + conf.data.pass + "@" +
			conf.data.host + ":" + conf.data.port + "/" + conf.data.use;
	}

    static init(_c, done) {
        MongoClient.connect(Database.formatMongoString(_c), (err, conn) => {
            _c.dbconn = conn;
            _c.db = conn.db(_c.data.use);

            conn.on('error', err => {
                Database.init(_c);
            });

            done(_c.db);
        });
    }
}

module.exports = Database;