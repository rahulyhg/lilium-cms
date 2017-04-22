// Shortcuts
const p = (str) => {
    console.log("[Thread "+threadID+"] " + str);
}

// Settings
const statsRefreshInterval = 1000 * 10;
const threadTotal = 8;

// Script data and libs
const cluster           = require('cluster');
const request           = require('request');
const fs                = require('fs');
const mkdirp            = require('mkdirp');
const readSplitJSON     = require("./lib/readsplitjson.js");
const dbconf            = require('./config/database.json');

// Database
const mongo             = require('mongodb');
const MongoClient       = mongo.MongoClient;
const mongourl          = "mongodb://" + dbconf.mongo.host + ":" + dbconf.mongo.port + "/" + dbconf.mongo.name;
const networkmongourl   = "mongodb://" + dbconf.mongo.host + ":" + dbconf.mongo.port + "/" + dbconf.mongo.networkname;

// Thread info
const threadID = cluster.isMaster ? "master" : process.env.processid && parseInt(process.env.processid);

// Connection to site database
let conn;

// Connection to network database
let nconn;

// Upload data
let dbFiles;

// Cluster stats
const clusterData = {
    workers : [],
    downloadsHandled : 0,
    startedat : new Date(),
    totalEntries : require('./output/uploads.json').length
};

const outputStats = () => {
    let diff = new Date() - clusterData.startedat;
    let minutes = Math.floor(diff / 1000 / 60);
    let seconds = Math.floor(diff / 1000) % 60;
    let ratio = (clusterData.downloadsHandled / clusterData.totalEntries * 100).toString().substring(0, 5);

    let avgtimeperdownload = diff / clusterData.downloadsHandled;
    let remaining = clusterData.totalEntries - clusterData.downloadsHandled;
    let timeremain = avgtimeperdownload * remaining;
    let eta = new Date(new Date().getTime() + timeremain);

    console.log();
    p(" # STATS : Handled " + clusterData.downloadsHandled + " / " + clusterData.totalEntries + " downloads ("+ratio+"%)");
    p(" # STATS : Time elapsed " + minutes + ":" + seconds + (seconds < 10 ? "0" : ""));
    p(" # STATS : ETA " + eta.toLocaleString());
    console.log();
};

const finishUp = () => {
    p(" > Closing connections");
    conn.close();
    nconn.close();

    p(" ! Done.");
    process.exit();
};

// Download files, skipping n files where n is the threadID
const download = () => {
    let i = threadID;
    let max = dbFiles.length;

    const handleNext = () => {
        if (i >= max) {
            return finishUp();
        }

        let file = dbFiles[i];
        let url = file.url.replace("www", "cdn");
        let sitesStringIndex = file.url.indexOf("sites");
        let filepath = "./downloads/" + file.url.substring(sitesStringIndex + 6);
        let split = filepath.split('/');
        split.pop();
        let dirpath = split.join('/');

        p("   + Downloading file at " + filepath + " with index ( " + i + " / " + max + " )");
    
        mkdirp(dirpath, () => {
            request.get(url).on("error", (err) => {
                p("   ? Error : " + err);
            }).on("response", (response) => {
                if (response.statusCode != 200) {
                    p("   ? Non-200 Status Code " + response.statusCode + " for image " + url);
                }

                i += threadTotal;
                process.send({message : "downloaded"});
                setTimeout(handleNext);
            }).pipe(fs.createWriteStream(filepath));
        });
    };

    handleNext();
};

// Load file and prepare multi-thread requests
const prepareUploads = () => {
    p(" > Reading JSON file");
    dbFiles = require('./output/uploads.json');
    p(" > Read " + dbFiles.length + " entries");

    download();
};

const receivedConnection = (err, tconn) => {
    conn = tconn;
    MongoClient.connect(networkmongourl, (err, tnconn) => {
        nconn = tnconn;
        prepareUploads();
    });
};

if (cluster.isMaster) {
    p(" ! Master process will start " + threadTotal + " threads");
    console.log();
    for (let i = 0; i < threadTotal; i++) {
        clusterData.workers.push(cluster.fork({processid : i}));
    }

    process.on('exit', () => {
        p(" ! All threads existed.");
        p(" ! Done.");
    });

    clusterData.workers.forEach(worker => {
        worker.on('message', (m) => {
            if (m.message == "downloaded") {
                clusterData.downloadsHandled++;
            }
        });
    });

    setInterval(outputStats, 10000);
} else {
    p(" ! Starting fork with processid : " + threadID);
    p(" > Connection using connection string => " + mongourl);
    MongoClient.connect(mongourl, receivedConnection);
}
