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

const cachedProvTopics = {
};

const _cityprov = {
    "montreal" : "qc",
    "toronto" : "on",
    "ottawa" : "on",
    "vancouver" : "bc",
    "quebec" : "qc",
    "halifax" : "ns",
    "calgary" : "al",
    "edmonton" : "al",
    "winnipeg" : "ma",
    "regina" : "sk",
    "stjohns" : "nl",
    "boston" : "ma"
};

const getCityParentTopic = (cityslug) => {
    let provslug = _cityprov[cityslug];
    if (provslug) {
        return cachedProvTopics[provslug];
    } 
};

const cityTopicObjects = {};

const createThirdLevel = (col, conn, done) => {
    console.log(" > CREATING THIRD LEVEL TOPICS");
    console.log("     Reading topic files ; should take a while");
    console.log("     Memory will be freed as posts are inserted");

    let thirdlevelindex = -1;
    let currentSite = {};
    let contentCol;
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

            let parentid = getCityParentTopic(currentSite.data.topic.slug);
            currentSite.data.topic.parent = parentid;

            if (parentid) {
                currentSite.data.topic.completeSlug = 
                    (currentSite.data.topic.slug == "boston" ? "us/" : "ca/") + 
                    _cityprov[currentSite.data.topic.slug] + "/" + currentSite.data.topic.slug;
            } else {
                currentSite.data.topic.completeSlug = currentSite.data.topic.slug;
            }

            console.log("      + /" + currentSite.data.topic.slug);
            col.insert(currentSite.data.topic, () => {
                let newid = currentSite.data.topic._id;
                let bottomLevelTopics = [];
                let wpid_assoc = {};
                for (var catwpid in currentSite.data.categories) {
                    let cat = currentSite.data.categories[catwpid];
                    bottomLevelTopics.push({
                        wp_id : catwpid,
                        displayname : cat.name,
                        slug : cat.slug,
                        completeSlug : currentSite.data.topic.completeSlug + "/" + cat.slug,
                        parent : newid
                    });

                    console.log("        + /" + cat.slug);
                }

                col.insertMany(bottomLevelTopics, () => {
                    console.log("      > HANDLING POSTS");
                    bottomLevelTopics.forEach((to) => {
                        wpid_assoc[to.wp_id] = to._id;
                    });

                    let posts = currentSite.data.posts;        
                    posts.forEach((post) => {
                        post.topic = wpid_assoc[post.wp_category.term_id];
                    });

                    contentCol.insertMany(posts, () => {
                        delete currentSite.data;
                        mgc();

                        nextThirdLevel();
                    });
                });
            });

        }
    };
    
    conn.collection('content', (err, contentcol) => {
        contentCol = contentcol;
        contentcol.remove({}, () => {
            nextThirdLevel();
        });
    });
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
                    col.insert(provObject, () => {
                        cachedProvTopics[provObject.slug] = provObject._id;
                        nextProvince();
                    });
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
                    createThirdLevel(col, conn, () => {
                        conn.close();
                        console.log(' > Done.');
                    });
                });
            });
        });
    });
};

console.log(" > Connection using connection string => " + mongourl);
MongoClient.connect(mongourl, receivedConnection);
