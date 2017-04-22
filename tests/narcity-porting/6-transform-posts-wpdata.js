// Script data and libs
const sites             = require('./output/wp_blogs_0000.json');
const readSplitJSON     = require("./lib/readsplitjson.js");
const dbconf            = require('./config/database.json');

// Database
const mongo             = require('mongodb');
const MongoClient       = mongo.MongoClient;
const mongourl          = "mongodb://" + dbconf.mongo.host + ":" + dbconf.mongo.port + "/" + dbconf.mongo.name;
const networkmongourl   = "mongodb://" + dbconf.mongo.host + ":" + dbconf.mongo.port + "/" + dbconf.mongo.networkname;

const collections = {
    content : undefined,
    entities : undefined
};

// Entity json file, keyed by Wordpress original ID
const entitiesByWP = {};

// Connection to site database
let conn;

// Connection to network database
let nconn;

const finishUp = () => {
    console.log(" > Closing connections");
    conn.close();
    nconn.close();

    console.log(" > Done.");
};

const setSponsoredData = (post) => {
    if (post.data.sponsored_post == "1") {
        post.isSponsored = true

        post.useSponsoredBox = post.data.use_sponsored_box == "1";
        if (post.useSponsoredBox) {
            post.sponsoredBoxTitle = post.data.sponsored_box_title;
            post.sponsoredBoxURL = post.data.sponsored_box_website_link;
            post.sponsoredBoxLogo_Wordpress = post.data.sponsored_box_logo;
            post.sponsoredBoxContent = post.data_sponsored_box_content_text;
        }

    } else {
        post.isSponsored = false;
    }

    return post.isSponsored;
};

const workPosts = () => {
    collections.content.find({}, (err, cursor) => {
        console.log(" > Affecting new authors to posts, falling back with user : " + entitiesByWP["9317477"].displayname); console.log();
        console.log("   # Default user identifier is " + entitiesByWP["9317477"]._id);

        let stats = {
            fallback : 0,
            affected : 0,
            sponsored : 0
        };

        let handleNext = () => {
            cursor.hasNext((err, hasnext) => {
                stats.affected++;

                if (hasnext) {
                    cursor.next((err, post) => {
                        let wp_author_id = post.wp_author.toString();
                        let newUser = entitiesByWP[wp_author_id];
                        if (!newUser) {
                            newUser = entitiesByWP["9317477"];
                            stats.fallback++;
                        }

                        post.author = newUser._id;
                        post.featuredimageartist = post.data.featured_image_credits_name;
                        post.featuredimagelink = post.data.featured_image_credits_url;
                        post.featuredimage_Wordpress = post.data._thumbnail_id;
    
                        setSponsoredData(post) && stats.sponsored++;

                        collections.content.update({_id : post._id}, post, handleNext);
                    });
                } else {
                    console.log("   # Affected " + stats.affected + " posts with " + stats.fallback + " fallbacks to default author");
                    console.log("   # " + stats.sponsored + " of them were sponsored"); console.log();

                    finishUp();
                }   
            });
        };

        handleNext();
    });
};

const startScript = () => {
    collections.entities.find({}, (err, allCur) => {
        // Group entities by wp_object.ID
        allCur.toArray((err, allE) => {
            console.log(' > Caching ' + allE.length + ' entities');
            for (let i = 0; i < allE.length; i++) {
                entitiesByWP[allE[i].wp_object.ID.toString()] = allE[i];
            }

            workPosts();
        });
    });
};

const createCollections = () => {
    conn.collection('content', (err, col) => {
        collections.content = col;
        nconn.collection('entities', (nerr, col) => {
            collections.entities = col;
            startScript();
        });
    });
};

const receivedConnection = (err, tconn) => {
    conn = tconn;
    MongoClient.connect(networkmongourl, (err, tnconn) => {
        nconn = tnconn;
        createCollections();
    });
};

console.log(" > Connection using connection string => " + mongourl);
MongoClient.connect(mongourl, receivedConnection);
