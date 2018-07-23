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
        preferences : [],
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
    log('Stack', "Mongo string : " + formatMongoString(config), 'info');
    MongoClient.connect(formatMongoString(config), (err, conn) => {
        err && log('Stack', err, 'err');
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

function transferWPImages(_c, data, done) {
    const path = require('path');
    const mkdirp = require('mkdirp');
    const request = require('request');
    const fs = require('fs');

    const files = [];

    let index = -1;
    const startTransfer = () => {
        let retrying = false;
        const nextImage = () => {
            const file = files[++index];

            if (file) {
                log('WPInit', '['+index+'/'+files.length+'] Downloading image file : ' + file.url, 'info');
                request({ url : file.url, encoding : 'binary' }, (err, res) => {
                    if (err) {
                        log('Wordpress', 'Error fetching image : ' + err, 'err');
                        return nextImage();
                    }
                    else if (res.statusCode == 200) {
                        mkdirp(file.dir, () => {
                            const ffpath = path.join(file.dir, file.filename);
                            log('WPInit', 'Writing file to ' + ffpath, 'info');
                            fs.writeFile(ffpath, res.body, {encoding : 'binary'}, (err) => {
                                err && log('WPInit', err, 'err');
                                return nextImage();
                            });
                        } else {
                            log('Wordpress', 'Non-200 HTTP code : ' + res.statusCode, 'warn');
                            if (retrying) {
                                    return nextImage();
                            }

                            --index;
                            retrying = true;

                            return setTimeout(() => nextImage(), 8000);
                        }
                    });
                });
            } else {
                log('WPInit', '--------------------------------', 'success');
                log('WPInit', 'Done handling WP images transfer', 'success');
                log('WPInit', '--------------------------------', 'success');

                return;
            }
        };

        setTimeout(nextImage, 0);
    };

    log('WPInit', 'Listing images to download', 'info');

    data.dbdata.uploads.reverse().filter(x => x.wppath).forEach(image => {
        const dir = path.join(_c.server.html, image.wppath);
        files.push[{
            url : _c.wp.url + image.wppath,
            filename : image.filename,
            dir
        }];
        Object.keys(image.sizes).forEach(size => {
            image.sizes[size].wpurl && files.push({
                url : _c.wp.url + image.sizes[size].wpurl,
                filename : image.sizes[size].wpfile,
                dir
            });
        })
    });

    log('WPInit', 'Done listing images for WP transfer. Total : ' + files.length, 'info');
    startTransfer();
    done();
};

function initializeHTTPS(config, data, done) {
    log('Init', 'Initializing nginx and HTTPS', 'info');
    const { initializeNginx } = require('./nginxconfig');
    initializeNginx(config, success => {
        success ? 
            log('Nginx', 'Successfully created HTTPS certs', 'success') :
            log('Nginx', 'Failed to create HTTPS certs', 'err');
            
        done();
    })
}

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
    tasks.push(initializeHTTPS);

    let i = -1;
    const nextTask = () => {
        const task = tasks[++i];
        task ? task(config, data, () => nextTask()) : done();
    };

    nextTask();
};

module.exports = { 
    createStack, parseWordpressXML, transformWordpressData, transferWPImages,
    createAdminEntity, createDatabase, initializeHTTPS
};
