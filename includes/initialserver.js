// Libraries
global.log = require('../log');
const buildLib = require('../build');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Constants
const INITIAL_SERVER_PORT = 14370;

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
    const server = http.createServer({}, (req, resp) => {
        if (req.url == "/") {
            resp.writeHead(200);
            resp.end(`<!DOCTYPE html><html><head><style>html,body{margin:0;}</style><title>Lilium CMS - Start</title></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>`);
        } else if (req.url == "/bundle.js") {
            let readstream = fs.createReadStream(path.join(liliumroot, 'tmp', 'app.bundle.js'));
            readstream.on('end', () => readstream.destroy());

            resp.writeHead(200);
            readstream.pipe(resp);       
        } else {
            resp.writeHead(404);
            resp.end();
        }
    });

    server.listen(INITIAL_SERVER_PORT);
    log('Init', 'Listening to port ' + INITIAL_SERVER_PORT, 'info');
});