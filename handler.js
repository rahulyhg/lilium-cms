// Will handle the requests and send info to the appropriate dispatcher
var Router = require('./router.js');
var Dispatcher = require('./dispatcher.js');
var inspect = require('util').inspect;
var Busboy = require('busboy');
var config = require('./config.js');
var fs = require('fs');
var fileserver = require('./fileserver.js');
var htmlserver = require('./frontend/htmlserver.js');
var db = require('./includes/db.js');
var imageSize = require('image-size');
var eventEmitter = new require('events').EventEmitter();
var log = require('./log.js');

var Handler = function () {
    var GET = function (cli) {
        cli.touch('handler.GET');

        Router.parseClientObject(cli, function(loggedin) {
            Dispatcher.dispatch(cli);
        });
    };

    var POST = function (cli) {
        cli.touch('handler.POST');

        Router.parseClientObject(cli, function(loggedin) { 
            if (loggedin || cli.routeinfo.path[0] === 'login') {
               cli.postdata = new Object();
               cli.postdata.length = cli.request.headers["content-length"];
               cli.postdata.data = {};
       
               var finishedCalled = false;
               var req = cli.request;
               var hasFile = false;
       
               req.headers["content-type"] = req.headers["content-type"] || "application/x-www-form-urlencoded";

               if (req.headers["content-type"] == "application/json") {
                    var chunks = "";

                    req.on('data', function(jsonchunk) {
                        chunks += jsonchunk;
                    });

                    req.on('end', function() {
                        try {
                            cli.postdata.data = JSON.parse(chunks);
                        } catch (ex) {
                            log('Handler', "Received weird JSON POST data. Threw error : " + ex, 'err');
                            cli.postdata.data = null;
                            cli.postdata.error = ex;
                        }

                        Dispatcher.dispost(cli);
                    });
               } else {
                   try {
                       var busboy = new Busboy({
                           headers: req.headers
                       });
                       // File upload
                       busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
                           if (parseInt(cli.request.headers['content-length']) > parseInt(cli._c.server.fileMaxSize)) {
                               file.resume();
                               hasFile = false;
                               finishedCalled = true;
                               return cli.throwHTTP(413, 'File is too large');

                           } else {
                               if (mimeTypeIsSupported(mimetype, cli)) {
                                   hasFile = true;
           
                                   var mime = getMimeByMimeType(mimetype, cli);
                                   //Gen random name
                                   filename = fileserver.genRandomNameFile(filename);
                                   var saveTo = cli._c.server.base + "backend/static/uploads/" + filename + mime;
                                   var name = filename + mime;

                                   file.pipe(fs.createWriteStream(saveTo));

                                   file.on('end', function () {
                                       cli.postdata.data[fieldname] = name;
                                   });
                               } else {
            
                                    file.resume();
                                    return notSupported(cli);
                                }
                            }
            
                        });
            
                        busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated) {
                            parsePOSTField(cli, fieldname, val);
                        });
            
                        busboy.on('finish', function () {
                            if (!finishedCalled) {
                                finishedCalled = true;

                                Dispatcher.dispost(cli);
                            }
                        });
                        req.pipe(busboy);
                    } catch (err) {
                         Dispatcher.dispost(cli);
                    }
                }
            } else {
                log('Handler', "Blocked POST at " + cli.routeinfo.fullpath + " from " + cli.request.connection.remoteAddress, 'detail');
                log('Handler', "User-Agent is : " + cli.request.headers["user-agent"], 'detail');
                cli.throwHTTP(401, undefined, true);
                return;
            }
        });
    };
    var mimeTypeIsSupported = function (mimetype, cli) {
        return getMimeByMimeType(mimetype, cli) ? true : false;
    }

    var getMimeByMimeType = function (mimeType, cli) {
        var mimes = cli._c.MIMES;
        for (var prop in mimes) {
            if (mimes.hasOwnProperty(prop)) {
                if (mimes[prop] === mimeType)
                    return prop;
            }
        }
    }

    var parsePOSTField = function (cli, fieldname, val) {
        var isBool = false;
        if (val == "on") {
            val = true;
            isBool = true;
        }

        if (fieldname.indexOf('[') == -1) {
            cli.postdata.data[fieldname] = val;
        } else {
            var reg = /\[([a-zA-ZÀ-ÿ0-9]*)\]/g;
            var firstLevel = fieldname.substring(0, fieldname.indexOf('['));

            if (typeof cli.postdata.data[firstLevel] === 'undefined') {
                if (fieldname.match(/\[/g).length > 1) {
                    cli.postdata.data[firstLevel] = new Object();
                } else {
                    cli.postdata.data[firstLevel] = new Array();
                }
            }

            if (fieldname.match(/\[/g).length > 1) {
                var currentLevel = cli.postdata.data[firstLevel];
                var levelsTotal = (fieldname.match(/\[/g) || []).length;
                var levelIndex = 0;
                var match = null;

                var isArray = fieldname.substring(fieldname.length-2) === "[]";

                while ((match = reg.exec(fieldname)) != null) {
                    var nIndex = match[1];
                    levelIndex++;

                    if (nIndex === '') {
                        currentLevel.push(isBool ? val : inspect(val).slice(1, -1));
                    } else {
                        if (typeof currentLevel[nIndex] === 'undefined') {
                            currentLevel[nIndex] = isArray && levelIndex == levelsTotal - 1 ? new Array() : levelIndex == levelsTotal ? (isBool ? val : inspect(val).slice(1, -1)) : new Object();
                        }
                    }

                    currentLevel = currentLevel[nIndex];
                }
            } else {
                cli.postdata.data[firstLevel].push(val)
            }
        }
    };

    var notSupported = function (cli) {
        cli.throwHTTP(405, 'Method Not Allowed : ' + cli.method, true);
    };

    var parseMethod = function (cli) {
        cli.touch('handler.parseMethod');

        switch (cli.method) {
        case 'GET':
            GET(cli);
            break;
        case 'POST':
            POST(cli);
            break;
        default:
            notSupported(cli);
            break;
        }
    };

    var clients = new Object();
    var totalRequests = 0;

    this.crash = function(err) {
        for (var k in clients) if (clients[k]) {
            clients[k].crash(err);
        }
    }

    var cleanClients = function() {
        log('Handler', 'Clearing undefined clients');
        var ctn = 0;
        var msNow = new Date();
        for (var k in clients) if (!clients[k]) {
            delete clients[k];
            ctn++;
        }
        
        log('Handler', 'Cleared ' + ctn + ' clients in ' + (new Date() - msNow) + 'ms');
    };

    var handleEnd = function(cli) {
        clients[cli.id] = undefined;
        totalRequests++;

        if (totalRequests % 1000 == 0) {
            cleanClients();
        }
    };

    this.handle = function (cli) {
        cli.touch('handler.handle');

        clients[cli.id] = cli;
        cli.bindEnd(handleEnd);

        if (cli.request.url[cli.request.url.length - 1] == "/") {
            cli.redirect(cli.request.url.slice(0, -1), true);
        } else {
            parseMethod(cli);
        }
    };

    var init = function () {

    };

    init();
};

module.exports = new Handler();
