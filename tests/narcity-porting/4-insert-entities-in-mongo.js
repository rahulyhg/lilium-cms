const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
const dbconf = require('./config/database.json');
const entities = require('./entities/entities.json');
const mongourl = "mongodb://" + dbconf.mongo.host + ":" + dbconf.mongo.port + "/" + dbconf.mongo.name;

const assess = (conn, done) => {
    console.log("Assessing insertion");
    conn.collection('entities', (err, col) => {
        col.find({fromscript : 1}, (err, cur) => {
            cur.count((err, ctn) => {
                if (ctn == entities.length) {
                    console.log("Everything was inserted successfully");
                } else {
                    console.log((entities.length - ctn) + " entities are missing");
                }

                done();
            });
        });
    });
};

const mergeUsers = (col, entity, existingUser, done) => {
    existingUser.wp_object = entity.wp_object;
    existingUser.fromscript = 1;
    if (existingUser.sites) {
        existingUser.sites.push("www.narcity.com");
    } else {
        existingUser.sites = ["www.narcity.com"];
    }

    col.updateOne({_id : existingUser._id}, existingUser, done);
};

const insertUsers = (col, done) => {
    console.log("Inserting " + entities.length + " entities");

    let userIndex = -1;
    let nextUser = () => {
        if (++userIndex == entities.length) {
            done();
        } else {
            let entity = entities[userIndex];
            entity.preferences = {};
            entity.fromscript = 1;

            col.find({username : entity.username}, (err, cur) => {
                cur.hasNext((err, hasnext) => {
                    if (hasnext) {
                        cur.next((err, existingUser) => {
                            console.log("Merging users for " + existingUser.displayname + " with existing id " + existingUser._id);
                            mergeUsers(col, entity, existingUser, nextUser);
                        });
                    } else {
                        col.insert(entity, (err, r) => {
                            console.log("Inserted user " + entity.username + " with id : " + entity._id);
                            nextUser();
                        });
                    }
                });
            });
        }
    };

    nextUser();
};

const receivedConnection = (err, conn) => {
    if (err) {
        return console.log("Could not connect : " + err);
    } 

    console.log("Connection established.");
    conn.collection('entities', (err, col) => {
        insertUsers(col, () => {
            assess(conn, () => {
                conn.close();
            });
        });
    });
};

console.log("Connection using connection string => " + mongourl);
MongoClient.connect(mongourl, receivedConnection);
