const Router = require('./router.js');
const Dispatcher = require('./dispatcher.js');
const inspect = require('util').inspect;
const Busboy = require('busboy');
const fs = require('fs');
const filelogic = require('./filelogic');
const hooks = require('../lib/hooks');
const mediaUpload = require('./mediaupload');

class Handler {
    GET(cli) {
        cli.touch('handler.GET');

        Router.parseClientObject(cli, (loggedin) => {
            Dispatcher.dispatch(cli);
        });
    };

    PUT(cli) {
        cli.touch('handler.PUT');

        Router.parseClientObject(cli, loggedin => {
            Dispatcher.disput(cli);
        });
    }

    DEL(cli) {
        cli.touch('handler.DEL');

        Router.parseClientObject(cli, loggedin => {
            Dispatcher.disdel(cli);
        });
    }

    POST(cli) {
        cli.touch('handler.POST');

        Router.parseClientObject(cli, (loggedin) => { 
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

                    req.on('data', (jsonchunk) => {
                        chunks += jsonchunk;
                    });

                    req.on('end', () => {
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
                       busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
                           if (!cli.hasRight('editor') && parseInt(cli.request.headers['content-length']) > parseInt(cli._c.server.fileMaxSize)) {
                               file.resume();
                               hasFile = false;
                               finishedCalled = true;
                               return cli.throwHTTP(413, 'File is too large', true);

                           } else {
                               if (this.mimeTypeIsSupported(mimetype, cli)) {
                                   hasFile = true;
           
                                   require('../media').getDirectoryForNew(cli._c, updir => {
                                       var mime = getMimeByMimeType(mimetype, cli);
                                       // Gen random name
                                       filename = filelogic.genRandomNameFile(filename);
                                       var saveTo = updir + filename + mime;
                                       var name = filename + mime;

                                       file.pipe(fs.createWriteStream(saveTo));

                                       file.on('end', () => {
                                           cli.postdata.data[fieldname] = name;
                                       });
                                   });
                               } else {
            
                                    file.resume();
                                    return notSupported(cli);
                                }
                            }
            
                        });
            
                        busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated) => {
                            this.parsePOSTField(cli, fieldname, val);
                        });
            
                        busboy.on('finish', () => {
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
    mimeTypeIsSupported(mimetype, cli) {
        return this.getMimeByMimeType(mimetype, cli) ? true : false;
    }

    getMimeByMimeType(mimeType, cli) {
        var mimes = cli._c.MIMES;
        for (var prop in mimes) {
            if (mimes.hasOwnProperty(prop)) {
                if (mimes[prop] === mimeType)
                    return prop;
            }
        }
    }

    parsePOSTField(cli, fieldname, val) {
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

    OPTIONS(cli) {
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

    notSupported(cli) {
        cli.throwHTTP(405, 'Method Not Allowed : ' + cli.method, true);
    };

    parseMethod(cli) {
        cli.touch('handler.parseMethod');

        switch (cli.method) {
            case 'GET':     this.GET(cli); break;
            case 'POST':    this.POST(cli); break;
            case 'PUT':     this.PUT(cli);  break;
            case 'DELETE' : this.DEL(cli); break;
            case 'OPTIONS': this.OPTIONS(cli); break;

            default:        this.notSupported(cli);
        }
    };

    handleAPI(cli) {
        Router.parseClientObject(cli, (loggedin) => {
            require('./api.js').serveApi(cli);
        });
    };

    handleMediaUpload(cli) {
        Router.parseClientObject(cli, (loggedin) => {
            mediaUpload.handleImageUpload(cli);
        });
    };

    handle(cli) {
        cli.touch('handler.handle');

        hooks.fire('request_handled', cli);
        try {
            if (cli.request.url.startsWith('/admin/mediaUpload') && cli.method == 'POST') {
                this.handleMediaUpload(cli);
            } else if (cli.request.url.startsWith('/api') /*&& cli.method == "OPTIONS"*/) {
                this.handleAPI(cli);
            } else {
                this.parseMethod(cli);
            }
        } catch (err) {
            log('Handler', 'Handler could not fulfill request', 'err');
            cli.crash(err);
        }
    };
};

module.exports = new Handler();
