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
var Communications = undefined;
var mail = undefined;
var styledpages = undefined;
var Media = undefined;
var imageSize = undefined;
var analytics = undefined;
var themes = undefined;
var entities = undefined;
var cacheInvalidator = undefined;
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
var persona = undefined;
var lys = undefined;
var backendSearch = undefined;
var devtools = undefined;
var postleaf = undefined;
var preferences = undefined;
var api = undefined;
var album = undefined;
var secrets = undefined;
var oembed = undefined;
var snips = undefined;
var tools = undefined;
var badges = undefined;
var conversations = undefined;
var localcast = undefined;
var feed = undefined;
var cdn = undefined;
var vocab = undefined;
var various = undefined;
var history = undefined;
var amp = undefined;

var log = require('./log.js');

var Core = function () {
    var loadRequires = function () {
        var nn = new Date();
        album = require('./album.js');
        api = require('./api.js');
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
        mail = require('./mail.js');
        admin = require('./backend/admin.js').init();
        Article = require('./article.js');
        Communications = require('./communications.js');
        snips = require('./snip.js');
        styledpages = require('./styledpages.js');
        analytics = require('./analytics.js');
        Media = require('./media.js');
        imageSize = require('./imageSize.js');
        themes = require('./themes.js');
        entities = require('./entities.js');
        cacheInvalidator = require('./cacheInvalidator.js');
        Frontend = require('./frontend.js');
        notification = require('./notifications.js');
        sessions = require('./session.js');
        Handler = require('./handler.js');
        ClientObject = require('./clientobject.js');
        Inbound = require('./inbound.js');
        Livevars = require('./livevars.js').init();
        Precompiler = require('./precomp.js');
        persona = require('./personas.js');
        lys = require('./lys.js');
        Petals = require('./petal.js');
        GC = require('./gc.js');
        scheduler = require('./scheduler.js');
        Role = require('./role.js');
        filelogic = require('./filelogic.js');
        category = require('./category.js');
        dashboard = require('./dashboard.js');
        templateBuilder = require('./templateBuilder.js');
        backendSearch = require('./backend/search.js');
        postleaf = require('./postleaf.js');
        devtools = require('./devtools.js');
        preferences = require('./preferences.js');
        tools = require('./tools.js');
        secrets = require('./secrets.js');
        badges = require('./badges.js');
        oembed = require('./embed.js');
        conversations = require("./conversations.js");
        localcast = require('./localcast.js');
        feed = require('./feed.js');
        cdn = require('./cdn.js');
        vocab = require('./vocab.js');
        various = require('./various.js');
        history = require('./history.js');
        amp = require('./amp.js');

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

        persona.bindHooks();
        cdn.bind();
        mail.bind();
        hooks.fire('hooks');
        log('Hooks', 'Loaded hooks', 'success');
    };

    var loadEndpoints = function () {
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

        endpoints.register('*', 'amp', 'GET', function(cli) {
            cli.touch("endpoints.GET.amp");
            amp.GET(cli);
        });

        admin.registerAdminEndpoint('welcome', 'GET', function(cli) {
            cli.touch('admin.GET.welcome');
            admin.welcome(cli, 'GET');
        });

        admin.registerAdminEndpoint('welcome', 'POST', function(cli) {
            cli.touch('admin.POST.welcome');
            admin.welcome(cli, 'POST');
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

        admin.registerAdminEndpoint('persona', 'GET', function(cli) {
            cli.touch('admin.GET.persona');
            persona.handleGET(cli);
        });

        admin.registerAdminEndpoint('persona', 'POST', function(cli) {
            cli.touch('admin.POST.persona');
            persona.handlePOST(cli);
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
            if (cli.hasRightOrRefuse("entities-act")) {
                filelogic.serveAdminLML(cli, false);
            }
        });

        admin.registerAdminEndpoint('album', 'POST', function (cli) {
            cli.touch('admin.POST.albums');
            album.handlePOST(cli);
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

        secrets.registerAdminEndpoint();
        devtools.registerAdminEndpoint();
        oembed.registerAdminEndpoint();
        tools.registerAdminEndpoint();
        conversations.registerAdminEndpoint();
        feed.registerAdminEndpoint();
        styledpages.registerAdminEndpoint();
        history.registerEndpoints();
        Article.registerContentEndpoint();
        Communications.setupController();
        analytics.setupController();
        mail.setupController();
        snips.setupController();

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
        imageSize.add("thumbnail", 150, 150);
        imageSize.add("square", 320, 320);
        imageSize.add("content", 640, '*');

        hooks.fire('image_sized_loaded');
    };

    var loadAdminMenus = function () {
        var aurl = "admin/"; //_c.default().server.url + "/admin/";

        admin.registerAdminMenu({
            id: "sites",
            faicon: "fa-sitemap",
            displayname: "Network",
            priority: 50,
            rights: ["manage-sites"],
            absURL: aurl + "sites",
            children: []
        });

        admin.registerAdminMenu({
            id: "feed",
            faicon: "fa-newspaper-o",
            displayname: "What's up",
            priority: 80,
            rights: ["dash"],
            absURL: aurl + "feed",
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
            displayname: "Content",
            priority: 200,
            rights: ["list-articles"],
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
            id: "styledpages",
            faicon: "fa-paragraph",
            displayname: "Styled Pages",
            priority: 250,
            rights: ["styledpages"],
            absURL: aurl + "styledpages/list",
            children: []
        });
        admin.registerAdminMenu({
            id: "mailtemplates",
            faicon: "fa-envelope-o",
            displayname: "Email Templates",
            priority: 250,
            rights: ["edit-emails"],
            absURL: aurl + "mailtemplates/list",
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
            id: "secrets",
            faicon: "fa-key",
            displayname: "Secrets",
            priority: 540,
            rights: ["list-secrets"],
            absURL: aurl + "secrets",
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
            id: "tools",
            faicon: "fa-wrench",
            displayname: "Tools",
            priority: 800,
            rights: [],
            absURL: aurl + "tools",
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
            absURL: aurl + "role/list",
            children: []
        });
        admin.registerAdminSubMenu('entities', {
            id: "entities-personas",
            faicon: "fa-users",
            displayname: "Personas",
            priority: 120,
            rights: ["manage-personas"],
            absURL: aurl + "persona/list",
            children: []
        });

        hooks.fire('adminmenus_created');
        log('Core', 'Registered Default Admin menus', 'success');
    };

    var loadPlugins = function (cb) {
        plugins.init(function () {
            log('Plugins', 'Loading plugins');

            plugins.bindEndpoints();

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

        entities.cacheRoles(cb);
    };

    var gracefullyCrash = function(err) {
        var stack = err.stack.split('\n');

        log('Core', '------------------------------------------------', 'err');
        log('Core', 'Exception made its way to core process', 'err');
        log('Core', '------------------------------------------------', 'err');
        log('Core', 'Error stack : ' + err, 'err');
        for (var i = 1; i < stack.length; i++) {
            log('Stack', stack[i], 'err');
        }
        log('Core', '------------------------------------------------', 'err');
        log('Core', 'Gracefully firing crash event to all modules', 'err');
        hooks.fire('crash', err);

        log('Core', 'Contacting handler to request a crash to all handles', 'err');
        require('./handler.js').crash(err);

        // log('Lilium', 'Shutting down');
        // process.exit();
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

    var schedulePreload = function() {
        var preloadSites = function() {
            _c.each(function(conf, next) {
                log('Schedule', 'Running Scheduled cache preloading for website ' + conf.website.sitetitle)
                hooks.fire('homepage_needs_refresh', {_c : conf});
                require('./cacheInvalidator.js').preloadLatests(conf, 50, 0, next);
            });
        }

        scheduler.schedule('cachePreloading', {
            every : {
                secondCount: 1000 * 60 * 5
            }
        }, preloadSites);

        preloadSites();
    };

    var loadLiveVars = function () {
        admin.registerLiveVar();
        Article.registerContentLiveVar();
        styledpages.registerLiveVar();
        Media.registerMediaLiveVar();
        entities.registerLiveVars();
        plugins.registerLiveVar();
        themes.registerLiveVar();
        sites.registerLiveVar();
        settings.registerLiveVar();
        lys.registerLiveVar();
        backendSearch.registerLiveVar();
        preferences.registerLiveVar();
        category.registerLiveVar();
        postleaf.registerLiveVar();
        persona.registerLiveVar();
        secrets.registerLiveVar();
        tools.registerLiveVar();
        badges.registerLiveVar();
        devtools.registerLiveVar();
        album.registerLiveVar();
        notification.registerLiveVar();
        conversations.registerLiveVar();
        feed.registerLiveVar();
        history.registerLiveVar();

        Livevars.registerDebugEndpoint();
        log('Core', 'Loaded live variables', 'success');
    };

    var initTables = function () {
        styledpages.registerTable();
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

        entities.init().registerCreationForm();
        LoginLib.registerLoginForm();
        Article.registerForms();
        styledpages.registerForm();
        themes.registerForm();
        settings.registerForm();
        sites.registerForms();
        preferences.registerForm();
        persona.registerForms();
        devtools.registerForms();

        hooks.fire('forms_init');
        log('Core', 'Forms were loaded', 'success');
    };

    var loadPostLeaves = function() {
        hooks.fire('post_leaves_will_register');

        require('./quiz.js').registerPostLeaf();
        require('./album.js').registerPostLeaf();
        postleaf.loadHooks();

        hooks.fire('post_leaves_registered');
    };

    var loadNotifications = function () {
        notification.init();
    }

    var notifyAdminsViaEmail = function() {
        db.findToArray(_c.default(), "entities", {roles : "lilium"}, function(err, users) {
            users.forEach(function(user) {
                if (user.email) {
                    mail.triggerHook(_c.default(), 'lilium_restarted', user.email, {
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

    var loadTools = function(cb) {
        tools.preloadTools(cb);
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
        category.registerLMLLib();
        hooks.trigger('loaded_core_lml_libs');
    };

    var precompile = function (done) {
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

    var loadVocab = function(done) {
        vocab.preloadDicos(done);
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
        log('Core', 'Initializing Lilium', 'lilium');
        bindCrash();

        require('./includes/caller.js')
        log('Core', 'Loading all websites', 'info');
        loadWebsites(function (resp) {
            loadRequires();
            loadHooks(readyToRock);
            loadPostLeaves();
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

            loadVocab(function() {
                loadPlugins(function () {
                    loadRoles(function () {
                        loadTools(function() {
                            precompile(function () {
                                redirectIfInit(resp, function () {
                                    loadAdminMenus();
                                    loadFrontend();
                                    loadForms();
                                    bindLocalCast();
        
                                    loadCacheInvalidator();
                                    scheduleGC();
                                    schedulePreload();
        
                                    log('Lilium', 'Starting inbound server', 'info');
                                    Inbound.createServer();
                                    loadNotifications();
                                    notifyAdminsViaEmail();
                                    Inbound.start();
        
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
