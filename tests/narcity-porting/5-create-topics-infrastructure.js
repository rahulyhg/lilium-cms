const sites = require('./output/wp_blogs_0000.json');
const readSplitJSON = require("./lib/readsplitjson.js");

const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
const dbconf = require('./config/database.json');
const mongourl = "mongodb://" + dbconf.mongo.host + ":" + dbconf.mongo.port + "/" + dbconf.mongo.name;

const provinceslib = require('provinces');
const canada = require('canada');
const unitedstates = require('us');

const fs = require('fs');
const topicFiles = fs.readdirSync('./topics');

const topics = {};

const provinces = {
    ca : [],
    us : []
};

for (let i = 0; i < provinceslib.length; i++) {
    let provobj = provinceslib[i];
    provobj.country = provobj.country.toLowerCase();
    if (!provinces[provobj.country]) {
        continue;
    }

    provobj.short && provinces[provobj.country].push({
        displayname : provobj.name,
        slug : provobj.short.toLowerCase(),
        completeSlug : provobj.country.toLowerCase() + "/" + provobj.short.toLowerCase(),
        active : true,
        description : provobj.name,
        lastUsed : new Date(),
        fromscript : 1
    });
}

const CanadaTopic = {
    "displayname" : "Canada", 
    "slug" : "ca", 
    "description" : "Everything canadian", 
    "active" : true, 
    "completeSlug" : "ca", 
    "lastUsed" : new Date(),
    "fromscript" : 1
};

const USATopic = {
    "displayname" : "United States of America", 
    "slug" : "us", 
    "description" : "Everything USA", 
    "active" : true, 
    "completeSlug" : "usa", 
    "lastUsed" : new Date(),
    "fromscript" : 1
};

const countryarr = [{
    code : "ca",
    topic : CanadaTopic
}, {
    code : "us",
    topic : USATopic
}];

const mgc = () => {
    if (typeof gc != "undefined") {
        gc();
    }
};

const getCityParentTopic = (cityslug) => {

};

const cityTopicObjects = {};
const linkThirdLevelWithParent = (col, done) => {
    console.log("Linking third level topics with second level, only if they're cities");
    done();
};

const createThirdLevel = (col, done) => {
    console.log(" > CREATING THIRD LEVEL TOPICS");
    console.log("     Reading topic files ; should take a while");
    console.log("     Memory will be freed as posts are inserted");

    let thirdlevelindex = -1;
    let currentSite = {};
    let nextThirdLevel = () => {
        if (++thirdlevelindex == topicFiles.length) {
            done();
        } else {
            currentSite.data = require("./topics/" + topicFiles[thirdlevelindex]);
            cityTopicObjects[currentSite.data.topic.slug] = currentSite.data.topic;
            console.log(
                "     Handling /" + currentSite.data.topic.slug + " ; " +
                "Current memory usage : " + (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + " Mb"
            );

            delete currentSite.data;
            mgc();

            nextThirdLevel();
        }
    };
    
    nextThirdLevel();
};

const createSecondLevel = (col, done) => {
    console.log(" > CREATING SECOND LEVEL TOPICS");
    let countryindex = -1;
    let nextCountry = () => {
        if (++countryindex == countryarr.length) {
            done();
        } else {
            let provindex = -1;
            let currentCountry = countryarr[countryindex]

            console.log("     " + currentCountry.topic.displayname.toUpperCase());
            let nextProvince = () => {
                if (++provindex == provinces[currentCountry.code].length) {
                    nextCountry();
                } else {
                    let provObject = provinces[currentCountry.code][provindex];
                    provObject.parent = currentCountry.topic._id;

                    console.log("      + " + provObject.displayname + " under /" + provObject.completeSlug);
                    col.insert(provObject, nextProvince);
                }
            };

            nextProvince();
        }
    };

    nextCountry();
};

const createTopLevel = (col, done) => {
    console.log(" > CREATING FIRST LEVEL TOPICS");
    col.insertMany([CanadaTopic, USATopic], (err, r) => {
        console.log("        Inserted " + countryarr.length + " first level topics");
        done();
    });
};

const receivedConnection = (err, conn) => {
    if (err) {
        return console.log("Could not connect : " + err);
    } 

    console.log(" > Connection established.");
    conn.collection('topics', (err, col) => {
        col.remove({fromscript : 1}, () => {
            createTopLevel(col, () => {
                createSecondLevel(col, () => {
                    createThirdLevel(col, () => {
                        linkThirdLevelWithParent(col, () => {
                            conn.close();
                            console.log(' > Done.');
                        });
                    });
                });
            });
        });
    });
};

console.log(" > Connection using connection string => " + mongourl);
MongoClient.connect(mongourl, receivedConnection);
