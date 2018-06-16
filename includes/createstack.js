// Script used to create a full Lilium stack from POST data
const XML2JS = require('xml2js');
const fs = require('fs');
const path = require('path');

// Parse Wordpress mySQL database from exported XML to mongo
function parseWordpressXML(dataref, next) {
    const parser = new XML2JS.Parser();
    log('Init', 'Parsing XML Wordpress data into JSON', 'info');
    parser.parseString(dataref.wordpressdb, (err, wpdata) => {
        const channel = wpdata.rss.channel[0];

        const dataset = {
            authors : channel["wp:author"],
            categories : channel["wp:category"],
            posts : channel.item
        };

        dataref.wordpresschannel = dataset;

        log('Init', 'Dumping Wordpress database parsed XML in json file', 'info')
        fs.writeFileSync(path.join(__dirname, '..', '..', 'wpdb.json'), JSON.stringify(wpdata), {flag : "w+"});        
        fs.writeFileSync(path.join(__dirname, '..', '..', 'wpdb.json'), JSON.stringify(channel), {flag : "w+"});

        log('Init', 'Wordpress data dump successful', 'success');
        next();
    });
};

function transformWordpressData(dataref, next) {
    const channel = dataref.wordpresschannel;

    next();
};

function createStack(data, done) {
    const tasks = [];

    log('Init', 'Checking for Wordpress db', 'info');
    if (data.wordpressdb) {
        tasks.push(parseWordpressXML);
        tasks.push(transformWordpressData);
    }

    let i = -1;
    const nextTask = () => {
        const task = tasks[++i];
        task ? task(data, () => nextTask()) : done();
    };

    nextTask();
};

module.exports = { createStack };