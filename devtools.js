var log = require('./log.js');
var Admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');
var lml = require('./lml.js');

var DevTools = function() {

};

var interpretLMLToCli = function(cli) {
    lml.executeFromString(cli._c.server.base + "/backend/dynamic/admin/", cli.postdata.data.lml, function(html) {
        cli.sendJSON({
            html: html
        });
    }, {
        config : cli._c,
        fromClient : true
    });
};

var handleGET = function(cli) {
    switch (cli.routeinfo.path[2]) {
        case 'livevars':
        case 'lml':
        case 'endpoints':
        case undefined:
            filelogic.serveAdminLML(cli);
            break;

        default:
            cli.throwHTTP(404, 'Not Found');
    }
};

var handlePOST = function(cli) {
    switch (cli.routeinfo.path[2]) {
        case 'lml':
            if (cli.routeinfo.path[3] === 'interpret') {
                interpretLMLToCli(cli);
            }
            break;
    }
};

DevTools.prototype.registerAdminEndpoint = function() {
    Admin.registerAdminEndpoint('devtools', 'GET', handleGET);
    Admin.registerAdminEndpoint('devtools', 'POST', handlePOST);
};

module.exports = new DevTools();
