var _c = undefined;
var Riverflow = undefined;
var hooks = undefined;
var endpoints = undefined;
var plugins = undefined;
var LML = undefined;
var LoginLib = undefined;
var db = undefined;
var fileserver = undefined;
var cli = undefined;
var admin = undefined;
var imageSize = undefined;
var entities = undefined;
var cacheInvalidator = undefined;
var Frontend = undefined;
var notification = undefined;
var Forms = undefined;
var sessions = undefined;
var Handler = undefined;
var ClientObject = undefined;
var Livevars = undefined;
var Precompiler = undefined;
var Petals = undefined;
var GC = undefined;
var scheduler = undefined;
var filelogic = undefined;
var dashboard = undefined;
var templateBuilder = undefined;
var persona = undefined;
var backendSearch = undefined;
var api = undefined;
var album = undefined;
var badges = undefined;
var localcast = undefined;
var cdn = undefined;
var vocab = undefined;
var various = undefined;

var log = require('./log.js');
var networkinfo = require('./network/info.js');
var isElder = networkinfo.isElderChild();

var Core = function () {
    var loadRequires = function () {
        var nn = new Date();
        album = require('./album.js');
        api = require('./api.js');
        _c = require('./config.js');
        Riverflow = require('./riverflow/riverflow.js');
        hooks = require('./hooks.js');
        endpoints = require('./endpoints.js');
        plugins = require('./plugins.js');
        LML = require('./lml.js');
        LoginLib = require('./backend/login.js');
        db = require('./includes/db.js');
        fileserver = require('./fileserver.js');
        cli = require('./cli.js');
        admin = require('./backend/admin.js').init();
        imageSize = require('./imageSize.js');
        entities = require('./entities.js');
        cacheInvalidator = require('./cacheInvalidator.js');
        Frontend = require('./frontend.js');
        notification = require('./notifications.js');
        sessions = require('./session.js');
        Handler = require('./handler.js');
        ClientObject = require('./clientobject.js');
        Livevars = require('./livevars.js').init();
        Precompiler = require('./precomp.js');
        persona = require('./personas.js');
        Petals = require('./petal.js');
        GC = require('./gc.js');
        scheduler = require('./scheduler.js');
        filelogic = require('./filelogic.js');
        dashboard = require('./dashboard.js');
        templateBuilder = require('./templateBuilder.js');
        backendSearch = require('./backend/search.js');
        badges = require('./badges.js');
        localcast = require('./localcast.js');
        cdn = require('./cdn.js');
        vocab = require('./vocab.js');
        various = require('./various.js');

        log('Core', 'Requires took ' + (new Date() - nn) + 'ms to initialize', 'lilium');
    };

    var loadHooks = function (readyToRock) {
        log('Hooks', 'Loading hooks', 'info');
        hooks.bindPluginDisabling();
        hooks.bind('init', 100, readyToRock);
        hooks.bind('user_loggedin', 100, function (cli) {
            cli.redirect(cli._c.server.url + "/" + cli._c.paths.admin, false);
            return true;
        });

        hooks.fire('hooks');
        log('Hooks', 'Loaded hooks', 'success');
    };

    var loadEndpoints = function () {
        if (global.liliumenv.mode == "script") {
            return;
        }


        log('Endpoints', 'Loading endpoints', 'info');
        endpoints.init();
        endpoints.register('*', 'login', 'POST', function (cli) {
            cli.touch("endpoints.POST.login");
            LoginLib.authUser(cli);
        });

        endpoints.register('*', 'magiclink', 'GET', function (cli) {
            cli.touch("endpoints.POST.login");
            LoginLib.magiclink(cli);
        });

        endpoints.register('*', 'admin', 'POST', function (cli) {
            cli.touch("endpoints.POST.admin");
            admin.handleAdminEndpoint(cli);
        });

        endpoints.register('*', 'logout', 'GET', function (cli) {
            cli.touch("endpoints.POST.logout");
            sessions.logout(cli);
        });

        admin.registerAdminEndpoint('welcome', 'GET', function(cli) {
            cli.touch('admin.GET.welcome');
            admin.welcome(cli, 'GET');
        });

        admin.registerAdminEndpoint('welcome', 'POST', function(cli) {
            cli.touch('admin.POST.welcome');
            admin.welcome(cli, 'POST');
        });

        admin.registerAdminEndpoint('activities', 'GET', function (cli) {
            cli.touch('admin.GET.activities');
            if (cli.hasRightOrRefuse("entities-act")) {
                filelogic.serveAdminLML(cli, false);
            }
        });

        admin.registerAdminEndpoint('me', 'POST', function (cli) {
            cli.touch('admin.POST.me');
            entities.adminPOST(cli);
        });

        admin.registerAdminEndpoint('me', 'GET', function (cli) {
            cli.touch('admin.GET.me');
            filelogic.serveAdminLML(cli, false);
        });

/*
        api.registerApiEndpoint('articles', 'GET', function (cli) {
            cli.touch('admin.GET.articles');
            api.articlesHandleGET(cli);
        });      

        api.registerApiEndpoint('authors', 'GET', function (cli) {
            cli.touch('admin.GET.authors');
            api.authorsHandleGET(cli);
        });  

        api.registerApiEndpoint('categories', 'GET', function (cli) {
            cli.touch('admin.GET.categories');
            api.categoriesHandleGET(cli);
        });  

        api.registerApiEndpoint('search', 'GET', function (cli) {
            cli.touch('admin.GET.search');
            api.searchArticles(cli);
        });  
*/

        hooks.fire('endpoints');
        log('Endpoints', 'Loaded endpoints', 'success');
    };

    var loadGlobalPetals = function () {
        Petals.register('adminbar', _c.default().server.base + 'backend/dynamic/admin/adminbar.petal');
        Petals.register('adminhead', _c.default().server.base + 'backend/dynamic/admin/adminhead.petal');
        Petals.register('adminsidebar', _c.default().server.base + 'backend/dynamic/admin/adminsidebar.petal');
        Petals.register('backendsearch', _c.default().server.base + 'backend/dynamic/admin/backendsearch.petal');
    };

    var loadImageSizes = function () {
        imageSize.add("thumbnail", 150, 150);
        imageSize.add("square", 320, 320);
        imageSize.add("content", 640, '*');

        hooks.fire('image_sized_loaded');
    };

    var loadPlugins = function (cb) {
        plugins.init(function () {
            log('Plugins', 'Loading plugins');

            var fireEvent = function () {
                log('Plugins', 'Loaded plugins');
                hooks.fire('plugins_loaded');
        
                return cb();
            };

            db.findToArray(_c.default(), 'plugins', {
                "active": true
            }, function (err, results) {
                if (err) {
                    log('Plugins', 'Failed to find entries in database; ' + err, 'err');
                    fireEvent();

                    return;
                }

                log('Plugins', 'Read plugins collection in database');
                var i = -1;
                var nextObject = function () {
                    i++
                    if (i != results.length) {
                        plugins.registerPlugin(results[i].identifier, nextObject);
                    } else {
                        fireEvent();
                    }
                };

                if (results.length > 0) {
                    nextObject();
                } else {
                    plugins.getPluginsDirList(function () {
                        log('Plugins', 'Nothing to register', 'info');
                        fireEvent();
                    });

                }
            });

        });

    };

    var loadRoles = function (cb) {
        entities.registerRole({
            name: 'admin',
            displayname: 'admin',
            power: 5
        }, ['dash', 'admin'], function () {
            return;
        }, true, true);

        entities.registerRole({
            name: 'lilium',
            displayname: 'lilium',
            power: 1
        }, ['dash', 'admin'], function () {
            return;
        }, true, true);

        cb();
    };

    var gracefullyCrash = function(err) {
        var stack = err.stack.split('\n');

        log('Core', '------------------------------------------------', 'detail');
        log('Core', 'Exception made its way to core process', 'err');
        log('Core', '------------------------------------------------', 'detail');
        log('Core', 'Error stack : ' + err, 'err');
        for (var i = 1; i < stack.length; i++) {
            log('Stack', stack[i], 'err');
        }
        log('Core', '------------------------------------------------', 'detail');
        log('Core', 'Gracefully firing crash event to all modules', 'info');
        hooks.fire('crash', err);

        log('Core', 'Contacting handler to request a crash to all handles', 'info');
        // require('./handler.js').crash(err);

        // log('Lilium', 'Shutting down');
        // process.exit();
    };

    var bindCrash = function() {
        if ( process.env.handleError != "crash" ) {
            process.on('uncaughtException', gracefullyCrash);
        }
    };

    var loadStandardInput = function () {
        var stdin = process.openStdin();
        stdin.liliumBuffer = "";
        stdin.on('data', function (chunk) {
            setTimeout(function () {
                chunk = chunk.toString().trim();
                stdin.liliumBuffer += chunk;

                if (chunk.length == 0) {
                    try {
                        eval(
                            'try{' +
                            stdin.liliumBuffer +
                            '}catch(ex){log("STDin","Error : "+ex)}'
                        );
                    } catch (err) {
                        log('STDin', 'Interpretation error : ' + err, 'err')
                    } finally {
                        stdin.liliumBuffer = "";
                    }
                }
            }, 0);
        });

        log("STDin", 'Listening to standard input', 'info');
    };

    var loadCacheInvalidator = function () {
        log("CacheInvalidator", 'Initializing cacheInvalidator', 'info');
        cacheInvalidator.init(function () {
            log("CacheInvalidator", 'Ready to invalidate cached files', 'success');
        });
    };

    var scheduleGC = function () {
        log('GC', 'Scheduling temporary file collection', 'info');
        scheduler.schedule('GCcollecttmp', {
            every: {
                secondCount: 1000 * 60 * 60
            }
        }, function () {
            GC.clearTempFiles(function () {
                log("GC", "Scheduled temporary files collection done", 'success');
            });
        });
    };

    var loadLiveVars = function () {
        admin.registerLiveVar();
        backendSearch.registerLiveVar();
        badges.registerLiveVar();
        notification.registerLiveVar();

        Livevars.registerDebugEndpoint();
        log('Core', 'Loaded live variables', 'success');
    };

    var initTables = function () {
        require('./tableBuilder.js').init();
    }

    var initForms = function () {
        Forms = require('./forms');
        var formBuilder = require('./formBuilder.js');
        formBuilder.init();
        Forms.init();
    };

    var loadForms = function () {
        log('Core', 'Loading multiple forms', 'info');

        LoginLib.registerLoginForm();

        hooks.fire('forms_init');
        log('Core', 'Forms were loaded', 'success');
    };

    var loadNotifications = function () {
        notification.init();
    }

    var notifyAdminsViaEmail = function() {
        if (!isElder) { return; }

        db.findToArray(_c.default(), "entities", {roles : "lilium"}, function(err, users) {
            users.forEach(function(user) {
                if (user.email) {
                    require('./mail.js').triggerHook(_c.default(), 'lilium_restarted', user.email, {
                        sigsha : require("crypto-js").SHA256(new Date()).toString(require("crypto-js").enc.Hex),
                        user : user,
                        lmllibs : ["config", "extra", "date"]
                    });
                }
            });
        });
    };

    var loadFrontend = function () {
        log('Frontend', 'Registering default values from core', 'info');
        Frontend.registerFromCore();
        hooks.fire('frontend_registered');
    };

    var prepareDefaultSiteCreation = function (cb) {
        require('./init.js')(cb);
    };

    var loadWebsites = function (loadEverything) {
        sites = require('./sites.js');

        var currentRoot = __dirname;
        var fss = require('./fileserver.js');

        log('Core', 'Reading sites directory', 'info');
        fss.dirExists(currentRoot + "/sites", function (exists) {
            if (exists) {
                fss.fileExists(currentRoot + "/sites/default.json", function (exists) {
                    if (exists) {
                        sites.loadSites(loadEverything);
                    } else {
                        prepareDefaultSiteCreation(loadEverything);
                    }
                });
            } else {
                prepareDefaultSiteCreation(loadEverything);
            }
        });
    };

    var loadLMLLibs = function () {
        hooks.trigger('will_load_core_lml_libs');
        dashboard.registerLMLLib();
        hooks.trigger('loaded_core_lml_libs');
    };

    var precompile = function (done) {
        if (global.liliumenv.mode == "script") {
            return done();
        }

        log('Core', 'Staring precompilation', 'info');
        hooks.fire("will_precompile");
        sites.loopPrecomp(function() {
            hooks.fire("did_precompile");
            done();
        });
    };

    var redirectIfInit = function (resp, cb) {
        if (resp) {
            resp.writeHead(200, {
                "Content-Type": "text/html"
            });
            resp.end(
                '<i>Please wait a moment...</i><script>setTimeout(function() {window.location = "' + resp.redirectTo + '"}, 1000);</script>',
                'utf8',
                function () {
                    resp.req.connection.unref();
                    resp.req.connection.destroy();
                    resp.server.close(cb);
                }
            );
        } else {
            cb();
        }
    };

    var bindLocalCast = function() {
        localcast.init();
        localcast.bind('lilium', function(payload) {
            log('Core', 'New process spawned with pid : ' + payload.from, 'info');
        });

        localcast.broadcast('lilium', {
            initialized : true
        });
    };

    var loadDocs = function(cb) {
        if (global.liliumenv.mode == "script") {
            return cb();
        }

        var docs = require('./docs.js');
        docs.compileDirectory(function() {
            docs.compileIndex(cb);
        });
    };

    var loadVocab = function(done) {
        vocab.preloadDicos(done);
    };

    var loadScriptMode = function() {
        if (global.liliumenv.mode == "script") {
            var scriptpath = global.liliumenv.script;
            if (scriptpath) {
                require(scriptpath);
            }
        }
    };

    var loadEnv = function() {
        log("Core", "Loading Lilium environment variables", "info");
        global.liliumenv = global.liliumenv || {};

        var argv = process.argv.splice(2);
        for (var i = 0; i < argv.length; i++) {
            var split = argv[i].split("=");
            global.liliumenv[split[0]] = split[1];
        }

        var env = process.env;
        for (var k in env) {
            global.liliumenv[k] = env[k];
        }
    };

    var executeRunScript = function() {
        if (global.liliumenv.mode == "script") {
            global.liliumenv.run && global.liliumenv.run.apply(require('./config.js'), [__dirname]);
        }
    }

    var loadBackendSearch = function() {
        backendSearch.registerSearchFormat({
            collection : "content",
            displayName : "Editorial",
            linkBase : "{adminurl}/article/edit/{$}",
            linkKey : "_id"
        }, {
            "title" : {displayName : "Title"},
            "subtitle" : {displayName : "Subtitle"},
            "date" : {displayName : "Published On"},
            "content" : {displayName : "Content", backendOnly : true}
        });

        backendSearch.registerSearchFormat({
            collection : 'entities',
            displayName : 'Users',
            linkBase : "{adminurl}/entities/edit/{$}",
            linkKey : "_id"
        }, {
            "username" : {displayName : "Username"},
            "displayname" : {displayName : "Display Name"},
            "email" : {displayName : "Email Address"}
        });
    };

    var maybeRunCAIJ = function() {
        if (process.env.job == "caij") {
            log('Core', 'Creating CAIJ server');
            require('./caij/caij.js').createServer();
        }
    }

    this.makeEverythingSuperAwesome = function (readyToRock) {
        log('Core', 'Initializing Lilium', 'lilium');
        loadEnv();
        bindCrash();

        require('./includes/caller.js')
        log('Core', 'Loading all websites', 'info');
        loadWebsites(function (resp) {
            loadRequires();
            loadHooks(readyToRock);
            
            initForms();
            initTables();
            loadEndpoints();
            loadStandardInput();
            loadScriptMode();
            loadImageSizes();
            loadLiveVars();
            loadGlobalPetals();
            loadLMLLibs();
            loadBackendSearch();
            
            loadVocab(function() {
                loadPlugins(function () {
                    loadRoles(function () {
                        precompile(function () {
                            loadDocs(function() {
                                redirectIfInit(resp, function () {
                                    loadFrontend();
                                    loadForms();
                                    bindLocalCast();
            
                                    Riverflow.loadFlows();
            
                                    loadCacheInvalidator();
                                    scheduleGC();
            
                                    log('Lilium', 'Starting inbound server', 'info');
                                    require('./inbound.js').createServer().start();
                                    loadNotifications();
                                    notifyAdminsViaEmail();
                                    executeRunScript();
                                    maybeRunCAIJ();
            
                                    log('Core', 'Firing initialized signal', 'info');
                                    hooks.fire('init');
                                });
                            });
                        });
                    });
                });
            });
        });
    };

    var init = function () {
        log('Core', 'Lilium core object was created', 'success');
    };

    init();
};

module.exports = new Core();
