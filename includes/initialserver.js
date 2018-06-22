// Libraries
global.log = require('../log');

const buildLib = require('../build');
const http = require('http');
const path = require('path');
const fs = require('fs');
const CryptoJS = require('crypto-js');
let manifest;

try {
    manifest = require('../../manifest');
} catch(err) {
    log('Init', 'FATAL : No manifest file found.', 'err');
    process.exit(1);
}

// Constants
const INITIAL_SERVER_PORT = 14370;

// Required fields
const REQUIRED_FIELDS = [
    "websiteurl", "websitelang",
    "networkproc", "networkport",
    "maxpostsize",
    "facebookappid", "facebookapppubtoken", "facebookappprivtoken", "facebookappogversion",
    "cdnurl",
    "darkskyttl",
    "websitetitle",
    "adminemail",
    "adminuser", "adminpass",
    "emailaddress", "emailpassword", "emailfrom",
    "googlekey", "googleaccountid", "googleview",
    "darkskykey"
];

// POST handler
const handleInitialPOST = (resp, dat, done) => {
    log('Init', 'Parsing POST data into JSON', 'info')
    try {
        dat = JSON.parse(dat);
    } catch (err) {
        log('Init', 'Failed to parse POST data, sending 400', 'warn');
        resp.writeHead(400, 'json');
        return resp.end();
    }

    log('Init', 'Successfully parsed JSON from POST data', 'success');
    let keys = Object.keys(dat);
    let valid = true;
    REQUIRED_FIELDS.forEach(x => {
        if (!keys.includes(x)) {
            valid = false;
        }
    });

    if (!valid) {
        log('Init', 'Found missing fields in POST data', 'warn');
        resp.writeHead(412);
        return resp.end();
    }fs.writeFileSync(path.join(__dirname, '..', '..', 'keys', 'dfp.json'), dat.dfpkey, {flag : "w+"});

    currentStatus = "working";
    resp.writeHead(200);
    resp.end();

    const config = mapPostDataToLiliumConfig(dat);

    log('Init', 'Creating default.json site config', 'info');
    fs.writeFileSync(path.join(__dirname, '..', 'sites', 'default.json'), JSON.stringify(config, null, 4), {flag : "w+"});

    log('Init', 'Creating Analytics key', 'info');
    fs.writeFileSync(path.join(__dirname, '..', '..', 'keys', 'analytics.json'), dat.googlekey, {flag : "w+"});

    log('Init', 'Creating Darksky key', 'info');
    fs.writeFileSync(path.join(__dirname, '..', '..', 'keys', 'darksky.json'), JSON.stringify({
        secretkey : dat.darkskykey,
        cachettl : dat.darkskyttl
    }), {flag : "w+"});

    log('Init', 'Creating DFP key', 'info');
    dat.dfpkey && fs.writeFileSync(path.join(__dirname, '..', '..', 'keys', 'dfp.json'), dat.dfpkey, {flag : "w+"});

    log('Init', 'Creating Twilio key', 'info');
    dat.twiliosid && fs.writeFileSync(path.join(__dirname, '..', '..', 'keys', 'twilio.json'), JSON.stringify({
        sid : dat.twiliosid,
        token : dat.twiliotoken,
        from : dat.twiliofrom
    }), {flag : "w+"});

    log('Init', 'Done creating key files', 'success');
    log('Init', 'Stack creation ongoing', 'info');
    require('./createstack').createStack(config, dat, () => {
        currentStatus = "done";

        setTimeout(() => {
            server.close(() => {});
            done();
        }, 3000);
    });
}

let currentStatus = "working";
let server;

const mapPostDataToLiliumConfig = dat => {
    let vbapi = dat.facebookappogversion.toString();
    if (!vbapi.includes('.')) {
        vbapi = vbapi + ".0";
    }

    let urldetails = require('url').parse(dat.websiteurl);
    let analyticsDetails = JSON.parse(dat.googlekey);

    log('Init', 'Mapping POST data to Lilium config', 'detail');
    return {
        env : "prod",
        caij : true,
        allowAnonymousPOST : true,
        dataserver : {
            port : 19805,
            active : true,
            facebook : {
                token : dat.facebookappprivtoken,
                v : vbapi
            }
        },
        info : {
            project : 'Lilium'
        },
        emails : {
            senderemail : dat.emailaddress,
            senderpass : dat.emailpassword,
            senderfrom : dat.emailfrom
        },
        data : manifest,
        paths: { 
            admin: 'admin',
            login: 'login',
            livevars: 'livevars',
            themes: 'flowers',
            mail: 'mail',
            themesInfo: 'info.json',
            plugins: 'plugins',
            pluginsInfo: 'info.json',
            uploads: 'uploads' 
        },
        server : {
            base : path.join(__dirname, "..") + "/",
            html : path.join(__dirname, '..', '..', 'default_html'),
            protocol : urldetails.protocol,
            url : "//" + urldetails.host,
            port : 8080,
            postMaxLength : 1024,
            fileMaxSize : dat.maxpostsize
        },
        analytics : {
            serviceaccount : analyticsDetails.client_email,
            jsonkeypath : path.join(__dirname, '..', '..', 'keys', 'analytics.json'),
            accountid : dat.googleaccountid,
            siteviewid : dat.googleview
        },
        usability : { admin: { loginIfNotAuth: true }, home: { keepInRAM: false } },
        website : {
            sitetitle : dat.websitetitle,
            catchline : '',
            language : dat.websitelang
        },
        id : urldetails.host || "default",
        uid : CryptoJS.SHA256(urldetails.host).toString(CryptoJS.enc.Hex),
        network: { 
            proxy: { listento: 9090, speakto: 8080 },
            localcast: { port: 5514 },
            loaded: true,
            familysize: dat.networkproc,
            cacheport: dat.networkport,
            realtimeport: 17210,
            useUDS: true 
        }
    };
}


module.exports.init = done => {
    // Build Preact App
    log('Init', 'Building Preact app', 'info');
    buildLib.build(
        undefined, 
        "initialserver",
        "initialserver",
        {
            outputpath : path.join(__dirname, '..', 'tmp'),
            babel : {
                "plugins": [
                    ["transform-react-jsx", { "pragma":"h" }]
                ],
                "presets" : ["es2015"]
            }
        }, 
    () => {
        // Server
        log('Init', 'Creating initial server', 'info');
        server = http.createServer({}, (req, resp) => {
            if (req.method == "POST") {
                log('Init', 'Received POST request', 'info');
                let dat = "";
                req.on('data', d => dat += d.toString());
                req.on('end', () => {
                    log('Init', 'Successfully read POST data', 'success');
                    handleInitialPOST(resp, dat, done);
                });
            } else if (req.url == "/status") {
                switch (currentStatus) {
                    case "working" : resp.writeHead(204); break;
                    case "error" : resp.writeHead(500); break;
                    case "done" : resp.writeHead(200); break;
                }

                resp.end();
            } else if (req.url == "/") {
                resp.writeHead(200);
                resp.end(`<!DOCTYPE html><html> 
                    <head>
                        <meta charset="utf-8">
                        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                        <link rel="stylesheet" href="https://pro.fontawesome.com/releases/v5.0.13/css/all.css" integrity="sha384-oi8o31xSQq8S0RpBcb4FaLB8LJi9AT8oIdmS1QldR8Ui7KUQjNAnDlJjp55Ba8FG" crossorigin="anonymous">
                        <link href="https://fonts.googleapis.com/css?family=Lobster|Lato|Oswald|PT+Serif|Quicksand:300,400,500" rel="stylesheet">
                        <link rel="icon" type="image/png" href="/favicon.png">
                        <link rel="stylesheet" type="text/css" href="/bundle.css" />
                        <title>Lilium Stack Installer</title>
                    </head>
                    <body>
                        <div id="app"></div>
                        <script src="/bundle.js"></script>
                    </body>
                </html>`);
            } else if (req.url == "/bundle.js") {
                let readstream = fs.createReadStream(path.join(liliumroot, 'tmp', 'app.bundle.js'));
                readstream.on('end', () => readstream.destroy());

                resp.writeHead(200);
                readstream.pipe(resp, {"content-type" : "text/javascript"});       
            } else if (req.url == "/bundle.css") {
                let readstream = fs.createReadStream(path.join(liliumroot, 'apps', 'initialserver', 'main.css'));
                readstream.on('end', () => readstream.destroy());

                resp.writeHead(200, {"content-type" : "text/css"});
                readstream.pipe(resp); 
            } else if (req.url == "/favicon.png") { 
                let readstream = fs.createReadStream(path.join(liliumroot, 'backend', 'static', 'media', 'lmllogo.png'));
                readstream.on('end', () => readstream.destroy());

                resp.writeHead(200, {"content-type" : "image/png"});
                readstream.pipe(resp);
            } else {
                resp.writeHead(404);
                resp.end();
            }
        });

        server.listen(INITIAL_SERVER_PORT);
        log('Init', 'Listening to port ' + INITIAL_SERVER_PORT, 'info');
    });
}
