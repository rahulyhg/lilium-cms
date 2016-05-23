var _c = undefined;
var settings = undefined;
var hooks = undefined;
var endpoints = undefined;
var plugins = undefined;
var LML = undefined;
var LoginLib = undefined;
var db = undefined;
var fs = undefined;
var fileserver = undefined;
var cli = undefined;
var admin = undefined;
var Article = undefined;
var Media = undefined;
var imageSize = undefined;
var themes = undefined;
var entities = undefined;
var cacheInvalidator = undefined;
var postman = undefined;
var Frontend = undefined;
var notification = undefined;
var Forms = undefined;
var sessions = undefined;
var sites = undefined;
var Handler = undefined;
var ClientObject = undefined;
var Inbound = undefined;
var Livevars = undefined;
var Precompiler = undefined;
var Petals = undefined;
var GC = undefined;
var scheduler = undefined;
var Role = undefined;
var filelogic = undefined;
var category = undefined;
var dashboard = undefined;
var templateBuilder = undefined;
var backendSearch = undefined;
var devtools = undefined;
var preferences = undefined;

var log = require('./log.js');

var Core = function () {
    var loadRequires = function () {
        var nn = new Date();
        _c = require('./config.js');
        settings = require('./settings.js');
        hooks = require('./hooks.js');
        endpoints = require('./endpoints.js');
        plugins = require('./plugins.js');
        LML = require('./lml.js');
        LoginLib = require('./backend/login.js');
        db = require('./includes/db.js');
        fs = require('fs');
        fileserver = require('./fileserver.js');
        cli = require('./cli.js');
        admin = require('./backend/admin.js').init();
        Article = require('./article.js');
        Media = require('./media.js');
        imageSize = require('./imageSize.js');
        themes = require('./themes.js');
        entities = require('./entities.js');
        cacheInvalidator = require('./cacheInvalidator.js');
        postman = require('./postman.js');
        Frontend = require('./frontend.js');
        notification = require('./notifications.js');
        sessions = require('./session.js');
        Handler = require('./handler.js');
        ClientObject = require('./clientobject.js');
        Inbound = require('./inbound.js');
        Livevars = require('./livevars.js').init();
        Precompiler = require('./precomp.js');
        Petals = require('./petal.js');
        GC = require('./gc.js');
        scheduler = require('./scheduler.js');
        Role = require('./role.js');
        filelogic = require('./filelogic.js');
        category = require('./category.js');
        dashboard = require('./dashboard.js');
        templateBuilder = require('./templateBuilder.js');
        backendSearch = require('./backend/search.js');
        devtools = require('./devtools.js');
        preferences = require('./preferences.js');

        log('Core', 'Requires took ' + (new Date() - nn) + 'ms to initialize');
    };

    var loadHooks = function (readyToRock) {
        log('Hooks', 'Loading hooks');
        hooks.bindPluginDisabling();
        hooks.bind('init', 100, readyToRock);
        hooks.bind('user_loggedin', 100, function (cli) {
            cli.redirect(cli._c.server.url + "/" + cli._c.paths.admin, false);
            return true;
        });
        hooks.fire('hooks');
        log('Hooks', 'Loaded hooks');
    };

    var loadEndpoints = function () {
        log('Endpoints', 'Loading endpoints');
        endpoints.init();
        endpoints.register('*', 'login', 'POST', function (cli) {
            cli.touch("endpoints.POST.login");
            LoginLib.authUser(cli);
        });

        endpoints.register('*', 'admin', 'POST', function (cli) {
            cli.touch("endpoints.POST.admin");
            admin.handleAdminEndpoint(cli);
        });

        endpoints.register('*', 'logout', 'GET', function (cli) {
            cli.touch("endpoints.POST.logout");
            sessions.logout(cli);
        });

        admin.registerAdminEndpoint('sites', 'GET', function (cli) {
            cli.touch('admin.GET.sites');
            sites.handleGET(cli);
        });

        admin.registerAdminEndpoint('sites', 'POST', function (cli) {
            cli.touch('admin.GET.sites');
            sites.handlePOST(cli);
        });

        admin.registerAdminEndpoint('dashboard', 'GET', function (cli) {
            cli.touch("admin.GET.dashboard");
            dashboard.handleGET(cli);
        });

        admin.registerAdminEndpoint('article', 'GET', function (cli) {
            cli.touch("admin.GET.article");
            Article.handleGET(cli);
        });

        admin.registerAdminEndpoint('entities', 'GET', function (cli) {
            cli.touch("admin.GET.entities");
            entities.handleGET(cli);
        });

        admin.registerAdminEndpoint('entities', 'POST', function (cli) {
            cli.touch("admin.POST.entities");
            entities.handlePOST(cli);
        });

        admin.registerAdminEndpoint('article', 'POST', function (cli) {
            cli.touch("admin.POST.article");
            Article.handlePOST(cli);
        });

        admin.registerAdminEndpoint('media', 'GET', function (cli) {
            cli.touch("admin.GET.media");
            Media.handleGET(cli);
        });

        admin.registerAdminEndpoint('media', 'POST', function (cli) {
            cli.touch("admin.POST.media");
            Media.handlePOST(cli);
        });

        admin.registerAdminEndpoint('settings', 'GET', function (cli) {
            cli.touch('admin.GET.settings');
            settings.handleGET(cli);
        });

        admin.registerAdminEndpoint('settings', 'POST', function (cli) {
            cli.touch('admin.POST.settings');
            settings.handlePOST(cli);
        });

        admin.registerAdminEndpoint('role', 'GET', function (cli) {
            cli.touch('admin.GET.role');
            Role.handleGET(cli);
        });

        admin.registerAdminEndpoint('role', 'POST', function (cli) {
            cli.touch('admin.POST.role');
            Role.handlePOST(cli);
        });

        admin.registerAdminEndpoint('activities', 'GET', function (cli) {
            cli.touch('admin.GET.activities');
            filelogic.serveAdminLML(cli, false);
        });

        admin.registerAdminEndpoint('me', 'POST', function (cli) {
            cli.touch('admin.POST.me');
            entities.handlePOST(cli);
        });

        admin.registerAdminEndpoint('me', 'GET', function (cli) {
            cli.touch('admin.GET.me');
            filelogic.serveAdminLML(cli, false);
        });

        admin.registerAdminEndpoint('preferences', 'GET', function(cli) {
            cli.touch('admin.GET.preferences');
            preferences.handleGET(cli);
        });

        admin.registerAdminEndpoint('preferences', 'POST', function(cli) {
            cli.touch('admin.POST.preferences');
            preferences.handlePOST(cli);
        });

        admin.registerAdminEndpoint('categories', 'POST', function (cli) {
            cli.touch('admin.POST.me');
            category.handlePOST(cli);
        });

        admin.registerAdminEndpoint('categories', 'GET', function (cli) {
            cli.touch('admin.GET.me');
            category.handleGET(cli, false);
        });

        devtools.registerAdminEndpoint();

        hooks.fire('endpoints');
        log('Endpoints', 'Loaded endpoints');
    };

    /**
     * Calls a function based on the path of the cli
     * @param  {ClientObject} cli    the ClientObject
     * @param  {class} _class the class where you want to call the function
     */
    var callFunction = function (cli, _class) {
        if (typeof _class[cli.routeinfo.path[1]] ==
            'function' && typeof cli.routeinfo.path[2] !==
            'undefined') {
            _class[cli.routeinfo.path[1]](cli, cli.routeinfo.path[2]);
        }
        if (typeof _class[cli.routeinfo.path[1]] == 'function') {
            _class[cli.routeinfo.path[1]](cli);
        } else {
            cli.throwHTTP(404, 'Page not found.');
        }
    }

    var loadGlobalPetals = function () {
        Petals.register('adminbar', _c.default().server.base + 'backend/dynamic/admin/adminbar.petal');
        Petals.register('adminhead', _c.default().server.base + 'backend/dynamic/admin/adminhead.petal');
        Petals.register('adminsidebar', _c.default().server.base + 'backend/dynamic/admin/adminsidebar.petal');
        Petals.register('backendsearch', _c.default().server.base + 'backend/dynamic/admin/backendsearch.petal');
    };

    var loadImageSizes = function () {
        imageSize.add("thumbnail", 150, '150');
        imageSize.add("medium", 300, '*');
        imageSize.add("thumbnailarchive", 400, 400);
        imageSize.add("featured", 970, 400);
    };

    var loadAdminMenus = function () {
        var aurl = "admin/"; //_c.default().server.url + "/admin/";

        admin.registerAdminMenu({
            id: "sites",
            faicon: "fa-sitemap",
            displayname: "Sites",
            priority: 50,
            rights: ["manage-sites"],
            absURL: aurl + "sites",
            children: []
        });
        admin.registerAdminMenu({
            id: "dashboard",
            faicon: "fa-tachometer",
            displayname: "Dashboard",
            priority: 100,
            rights: ["dash"],
            absURL: aurl + "dashboard",
            children: []
        });
        admin.registerAdminMenu({
            id: "articles",
            faicon: "fa-pencil",
            displayname: "Posts",
            priority: 200,
            rights: ["publish"],
            absURL: aurl + "article",
            children: []
        });

        admin.registerAdminSubMenu('articles', {
            id: "articles-category",
            faicon: "fa-cubes",
            displayname: "Categories",
            priority: 200,
            rights: ["manage-categories"],
            absURL: aurl + "categories",
            children: []
        });
        admin.registerAdminMenu({
            id: "media",
            faicon: "fa-picture-o",
            displayname: "Media",
            priority: 400,
            rights: ["list-uploads"],
            absURL: aurl + "media/list",
            children: []
        });
        admin.registerAdminMenu({
            id: "entities",
            faicon: "fa-users",
            displayname: "Entities",
            priority: 500,
            rights: ["list-entities"],
            absURL: aurl + "entities",
            children: []
        });
        admin.registerAdminMenu({
            id: "themes",
            faicon: "fa-paint-brush",
            displayname: "Themes",
            priority: 600,
            rights: ["manage-themes"],
            absURL: aurl + "themes",
            children: []
        });
        admin.registerAdminMenu({
            id: "plugins",
            faicon: "fa-plug",
            displayname: "Plugins",
            priority: 700,
            rights: ["manage-plugins"],
            absURL: aurl + "plugins",
            children: []
        });
        admin.registerAdminMenu({
            id: "settings",
            faicon: "fa-cogs",
            displayname: "Settings",
            priority: 1000,
            rights: ["manage-settings"],
            absURL: aurl + "settings",
            children: []
        });
        admin.registerAdminMenu({
            id: "devtools",
            faicon: "fa-hashtag",
            displayname: "Dev Tools",
            priority: 2000,
            rights: ["develop"],
            absURL: aurl + "devtools",
            children: []
        });
        admin.registerAdminSubMenu('entities', {
            id: "entities-rights",
            faicon: "fa-minus-circle",
            displayname: "Roles",
            priority: 100,
            rights: ["manage-roles"],
            absURL: aurl + "role",
            children: []
        });
        admin.registerAdminMenu({
            id: "activities",
            faicon: "fa-eye",
            displayname: "User Activities",
            priority: 800,
            rights: ["view-user-activities"],
            absURL: aurl + "activities/",
            children: []
        });

        hooks.fire('adminmenus_created');
        log('Core', 'Registered Default Admin menus');
    };

    var loadPlugins = function (cb) {
        plugins.init(function () {
            log('Plugins', 'Loading plugins');

            plugins.bindEndpoints();

            var fireEvent = function () {
                log('Plugins', 'Loaded plugins');
                return cb();
            };

            db.findToArray(_c.default(), 'plugins', {
                "active": true
            }, function (err, results) {
                if (err) {
                    log('Plugins', 'Failed to find entries in database; ' + err);
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
                        log('Plugins', 'Nothing to register');
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

        entities.cacheRoles(cb);
    };

    var gracefullyCrash = function(err) {
        var stack = err.stack.split('\n');

        log('Core', '------------------------------------------------');
        log('Core', 'Exception made its way to core process');
        log('Core', '------------------------------------------------');
        log('Core', 'Error stack : ' + err);
        for (var i = 1; i < stack.length; i++) {
            log('Stack', stack[i]);
        }
        log('Core', '------------------------------------------------');
        log('Core', 'Gracefully firing crash event to all modules');
        hooks.fire('crash', err);

        log('Core', 'Contacting handler to request a crash to all handles');
        require('./handler.js').crash(err);

        log('Lilium', 'Shutting down');
        process.exit();
    };

    var bindCrash = function() {
        process.on('uncaughtException', gracefullyCrash);
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
                        log('STDin', 'Interpretation error : ' + err)
                    } finally {
                        stdin.liliumBuffer = "";
                    }
                }
            }, 0);
        });

        log("STDin", 'Listening to standard input');
    };

    var loadCacheInvalidator = function () {
        if (_c.default().env == 'dev') {
            log("CacheInvalidator", 'Clearing old cached files in db');
            db.remove(_c.default(), 'cachedFiles', {}, function () {}, false);
        }
        log("CacheInvalidator", 'Initializing cacheInvalidator');
        cacheInvalidator.init(function () {
            log("CacheInvalidator", 'Ready to invalidate cached files!');
        });
    };

    var scheduleGC = function () {
        log('GC', 'Scheduling temporary file collection');
        scheduler.schedule('GCcollecttmp', {
            every: {
                secondCount: 1000 * 60 * 60
            }
        }, function () {
            GC.clearTempFiles(function () {
                log("GC", "Scheduled temporary files collection done");
            });
        });
    };

    var loadLiveVars = function () {
        admin.registerLiveVar();
        Article.registerContentLiveVar();
        Media.registerMediaLiveVar();
        entities.registerLiveVars();
        plugins.registerLiveVar();
        themes.registerLiveVar();
        sites.registerLiveVar();
        settings.registerLiveVar();
        backendSearch.registerLiveVar();
        preferences.registerLiveVar();

        Livevars.registerDebugEndpoint();
    };

    var loadPostman = function () {
        postman.createTransporter();
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
        log('Core', 'Loading multiple forms');

        entities.init().registerCreationForm();
        LoginLib.registerLoginForm();
        Article.registerForms();
        settings.registerForm();
        sites.registerForms();
        preferences.registerForm();

        hooks.fire('forms_init');
        log('Core', 'Forms were loaded');
    };

    var loadNotifications = function () {
        notification.init();
    }

    var loadFrontend = function () {
        log('Frontend', 'Registering default values from core');
        Frontend.registerFromCore();
        hooks.fire('frontend_registered');
    };

    var loadRequestHandler = function () {
        hooks.bind('request', 1000, function (params) {
            // Run main modules
            var clientObject = new ClientObject(params.req, params.resp);
            Handler.handle(clientObject);
        });
    };

    var prepareDefaultSiteCreation = function (cb) {
        require('./init.js')(cb);
    };

    var loadWebsites = function (loadEverything) {
        sites = require('./sites.js');

        var currentRoot = __dirname;
        var fss = require('./fileserver.js');

        log('Core', 'Reading sites directory');
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
        log('Core', 'Staring precompilation');
        sites.loopPrecomp(done);
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

    this.makeEverythingSuperAwesome = function (readyToRock) {
        log('Core', 'Initializing Lilium');
        bindCrash();

        require('./includes/caller.js')

        log('Core', 'Loading all websites');
        loadWebsites(function (resp) {
            loadRequires();
            loadHooks(readyToRock);
            initForms();
            initTables();
            loadEndpoints();
            loadStandardInput();
            loadImageSizes();
            loadLiveVars();
            loadGlobalPetals();
            loadRequestHandler();
            loadLMLLibs();
            loadBackendSearch();

            loadPlugins(function () {
                loadRoles(function () {
                    precompile(function () {
                        redirectIfInit(resp, function () {
                            loadAdminMenus();
                            loadFrontend();
                            loadForms();

                            loadCacheInvalidator();
                            scheduleGC();

                            log('Lilium', 'Starting inbound server');
                            Inbound.createServer();
                            loadNotifications();
                            Inbound.start();

                            log('Core', 'Firing initialized signal');
                            hooks.fire('init');
                        });
                    });
                });
            });
        });
    };

    var init = function () {
        log('Core', 'Lilium core object was created');
    };

    init();
};

module.exports = new Core();
