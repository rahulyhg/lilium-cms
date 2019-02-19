var Router = require('./router.js');
var Dispatcher = require('./dispatcher.js');
var inspect = require('util').inspect;
var Busboy = require('busboy');
var config = require('../lib/config');
var fs = require('fs');
const filelogic = require('./filelogic');
var htmlserver = require('./htmlserver.js');
var db = require('../lib/db.js');
var imageSize = require('image-size');
var eventEmitter = new require('events').EventEmitter();
const hooks = require('../lib/hooks');
const mediaUpload = require('./mediaupload');

var Handler = function () {
    var GET = function (cli) {
        cli.touch('handler.GET');

        Router.parseClientObject(cli, function(loggedin) {
            Dispatcher.dispatch(cli);
        });
    };

    var PUT = function(cli) {
        cli.touch('handler.PUT');

        Router.parseClientObject(cli, loggedin => {
            Dispatcher.disput(cli);
        });
    }

    var DEL = function(cli) {
        cli.touch('handler.DEL');

        Router.parseClientObject(cli, loggedin => {
            Dispatcher.disdel(cli);
        });
    }

    var POST = function (cli) {
        cli.touch('handler.POST');

        Router.parseClientObject(cli, function(loggedin) { 
            if (cli._c.allowAnonymousPOST && !loggedin && !cli.routeinfo.login) {
                // Do not read post data yet
                Dispatcher.dispost(cli);
            } else if (loggedin || cli.routeinfo.path[0] === 'login') {
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
                           if (!cli.hasRight('editor') && parseInt(cli.request.headers['content-length']) > parseInt(cli._c.server.fileMaxSize)) {
                               file.resume();
                               hasFile = false;
                               finishedCalled = true;
                               return cli.throwHTTP(413, 'File is too large', true);

                           } else {
                               if (mimeTypeIsSupported(mimetype, cli)) {
                                   hasFile = true;
           
                                   require('../media').getDirectoryForNew(cli._c, updir => {
                                       var mime = getMimeByMimeType(mimetype, cli);
                                       //Gen random name
                                       filename = filelogic.genRandomNameFile(filename);
                                       var saveTo = updir + filename + mime;
                                       var name = filename + mime;

                                       file.pipe(fs.createWriteStream(saveTo));

                                       file.on('end', function () {
                                           cli.postdata.data[fieldname] = name;
                                       });
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
                            currentLevel[nIndex] = isArray && levelIndex == levelsTotal - 1 ? [] : levelIndex == levelsTotal ? (isBool ? val : inspect(val).slice(1, -1)) : {};
                        }
                    }

                    currentLevel = currentLevel[nIndex];
                }
            } else {
                cli.postdata.data[firstLevel].push(val)
            }
        }
    };

    var OPTIONS = function(cli) {
        if (!cli._c) {
            require('../lib/config').fetchConfigFromCli(cli);
        }

        const origin = cli.request.headers.corsorigin || cli.request.headers.origin || (cli._c && cli._c.server.url);

        if (origin) {
            cli.response.writeHead(200, {
                "Access-Control-Allow-Origin" : origin,
                "Access-Control-Allow-Methods" : "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers" : cli.request.headers["access-control-request-headers"] || "*"
            });
        } else {
            cli.response.writeHead(400);
        }
    
        cli.response.end();
    };

    var notSupported = function (cli) {
        cli.throwHTTP(405, 'Method Not Allowed : ' + cli.method, true);
    };

    var parseMethod = function (cli) {
        cli.touch('handler.parseMethod');

        switch (cli.method) {
            case 'GET':     GET(cli); break;
            case 'POST':    POST(cli); break;
            case 'PUT':     PUT(cli);  break;
            case 'DELETE' : DEL(cli); break;
            case 'OPTIONS': OPTIONS(cli); break;

            default:        notSupported(cli);
        }
    };

    var handleAPI = function(cli) {
        Router.parseClientObject(cli, (loggedin) => {
            require('./api.js').serveApi(cli);
        });
    };

    const handleMediaUpload = (cli) => {
        Router.parseClientObject(cli, (loggedin) => {
            mediaUpload.handleImageUpload(cli);
        });
    };

    this.handle = function (cli) {
        cli.touch('handler.handle');

        hooks.fire('request_handled', cli);
        try {
            if (cli.request.url.startsWith('/admin/mediaUpload') && cli.method == 'POST') {
                handleMediaUpload(cli);
            } else if (cli.request.url.startsWith('/api') /*&& cli.method == "OPTIONS"*/) {
                handleAPI(cli);
            } else {
                parseMethod(cli);
            }
        } catch (err) {
            log('Handler', 'Handler could not fulfill request', 'err');
            cli.crash(err);
        }
    };
};

module.exports = new Handler();
