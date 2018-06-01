// Libraries
const log = require('../log');
const buildLib = require('../build');
const http = require('http');
const path = require('path');

// Constants
const INITIAL_SERVER_PORT = 14370;

// Build Preact App
log('Init', 'Building Preact app', 'info');
buildLib.build(
    undefined, 
    "initialserver",
    "initialserver",
    {
        
    }, 
() => {
    // Server
    log('Init', 'Creating initial server', 'info');
    const server = http.createServer({}, (req, resp) => {
        resp.end("Hello, world!");
    });

    server.listen(INITIAL_SERVER_PORT);
    log('Init', 'Listening to port ' + INITIAL_SERVER_PORT, 'info');
});