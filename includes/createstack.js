// Script used to create a full Lilium stack from POST data
const XML2JS = require('xml2js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto-js');
const { ObjectId, MongoClient } = require('mongodb'); 

// Parse Wordpress mySQL database from exported XML to mongo
function parseWordpressXML(config, dataref, next) {
    const parser = new XML2JS.Parser();
    log('Init', 'Parsing XML Wordpress data into JSON', 'info');
    parser.parseString(dataref.wordpressdb, (err, wpdata) => {
        const channel = wpdata.rss.channel[0];
        dataref.wordpresschannel = channel;

        log('Init', 'Dumping Wordpress database parsed XML in json file', 'info')
        fs.writeFileSync(path.join(__dirname, '..', '..', 'wpdb.json'), JSON.stringify(wpdata), {flag : "w+"});        
        fs.writeFileSync(path.join(__dirname, '..', '..', 'wpchannel.json'), JSON.stringify(channel), {flag : "w+"});

        log('Init', 'Wordpress data dump successful', 'success');
        next();
    });
};

function transformWordpressData(config, dataref, next) {
    const channel = dataref.wordpresschannel;
    require('./transformwp')(config, channel, dbdata => {
        Object.assign(dataref.dbdata, dbdata);

        next();
    });
};

function createAdminEntity(config, dataref, next) {
    dataref.dbdata.entities = dataref.dbdata.entities || [];

    let maybeadmin = dataref.dbdata.entities.find(x => x.username == dataref.adminuser);
    if (maybeadmin) {
        maybeadmin.username += "_wp";
    }

    dataref.dbdata.entities.push({
        _id : new ObjectId(),
        username : dataref.adminuser,
        shhh : crypto.SHA256(dataref.adminpass).toString(),
        email : dataref.adminemail,
        jobtitle : "Administrator",
        displayname : "Lilium Administrator",
        description : "I created this website.",
        avatarURL : config.server.protocol + config.server.url + "/static/media/lmllogo.png",
        avatarMini : config.server.protocol + config.server.url + "/static/media/lmllogo.png",
        socialnetworks : {
            facebook : "", twitter : "", googleplus : "", instagram : ""
        },
        roles : ["admin", "lilium"],
        personality : null,
        welcomed : true, 
        slug : dataref.adminuser,
        sites : [config.id],
        firstname : "Lilium",
        lastname : "Administrator",
        phone : "",
        createdOn : new Date(),
        magiclink : "",
        totalLogin : 0,
        geo : {},
        mustupdatepassword : false,
        revoked : false
    });

    next();
};

const formatMongoString = conf => 'mongodb://' + conf.data.user + ":" + conf.data.pass + "@" + conf.data.host + ":" + conf.data.port + "/" + conf.data.use;
function createDatabase(config, dataref, next) {
    MongoClient.connect(formatMongoString(config), (err, conn) => {
        const db = conn.db(config.data.use);
        const colls = Object.keys(dataref.dbdata);
        let index = -1;
    
        const createNextCollection = () => {
            if (++index == colls.length) {
                const versions = require('../versions');
                const verarray = Object.keys(versions).map(v => {
                    return {
                        codename : v.codename, 
                        script : v.script, 
                        features : v.features, 
                        v
                    };
                })

                db.collection('lilium').insertMany(verarray, () => {
                    next();
                });
            } else {
                const col = db.collection(colls[index]);
                col.insertMany(dataref.dbdata[colls[index]], (err) => {
                    err ? 
                        log('Init', 'Error inserting entries in ' + colls[index], 'err') :
                        log('Init', 'Successfully inserted ' + dataref.dbdata[colls[index]].length + ' entries in collection ' + colls[index], 'success');

                    createNextCollection();
                })
            }
        };

        createNextCollection();
    });
};

function transferWPImages(config, data, done) {
    done();
};

function createStack(config, data, done) {
    const tasks = [];
    data.dbdata = {
        roles : require('./defaultroles')
    };

    log('Init', 'Checking for Wordpress db', 'info');
    if (data.wordpressdb) {
        tasks.push(parseWordpressXML);
        tasks.push(transformWordpressData);
        tasks.push(transferWPImages);
    }

    tasks.push(createAdminEntity);
    tasks.push(createDatabase);

    let i = -1;
    const nextTask = () => {
        const task = tasks[++i];
        task ? task(config, data, () => nextTask()) : done();
    };

    nextTask();
};

module.exports = { createStack };