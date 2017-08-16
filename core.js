const log = require('./log.js');
const hooks = require('./hooks.js');
const db = require('./includes/db.js');
const isElder = require('./network/info.js').isElderChild();

class Core {
    constructor() {
        log('Core', 'Lilium core object was created', 'success');
    }
    
    makeEverythingSuperAwesome(readyToRock) {
        log('Core', 'Initializing Lilium', 'lilium');
        loadEnv();
        bindCrash();

        const inbound = require('./inbound.js')
        inbound.createServer(true);

        require('./includes/caller.js')
        log('Core', 'Loading all websites', 'info');
        loadWebsites((resp) => {
            loadHooks(readyToRock);
            
            loadForms();
            loadTables();
            loadEndpoints();
            loadStandardInput();
            loadScriptMode();
            loadImageSizes();
            loadLiveVars();
            loadGlobalPetals();
            loadLMLLibs();
            loadBackendSearch();
            
            loadVocab(() => {
                loadPlugins(() => {
                    loadRoles(() => {
                        precompile(() => {
                            loadDocs(() => {
                                redirectIfInit(resp, () => {
                                    loadFrontend();
                                    bindLocalCast();
            
                                    require('./riverflow/riverflow.js').loadFlows();
                                    inbound.handleQueue();
            
                                    loadCacheInvalidator();
                                    scheduleGC();
            
                                    log('Lilium', 'Starting inbound server', 'info');
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
};

const loadHooks = (readyToRock) => {
    log('Hooks', 'Loading hooks', 'info');
    hooks.bindPluginDisabling();
    hooks.bind('init', 100, readyToRock);

    hooks.fire('hooks');
    log('Hooks', 'Loaded hooks', 'success');
};

const loadEndpoints = () => {
    if (global.liliumenv.mode == "script") { return; }

    log('Endpoints', 'Loading endpoints', 'info');
    const endpoints = require('./endpoints.js');
    const filelogic = require('./filelogic.js');
    const admin = require('./backend/admin.js');
    const entities = require('./entities.js');
    const LoginLib = require('./backend/login.js');

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
        const sessions = require('./session.js');
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

    hooks.fire('endpoints');
    log('Endpoints', 'Loaded endpoints', 'success');
};

const loadGlobalPetals = function () {
    const Petals = require('./petal.js');
    const _c = require('./config.js');
    Petals.register('adminbar',         _c.default().server.base + 'backend/dynamic/admin/adminbar.petal');
    Petals.register('adminhead',        _c.default().server.base + 'backend/dynamic/admin/adminhead.petal');
    Petals.register('adminsidebar',     _c.default().server.base + 'backend/dynamic/admin/adminsidebar.petal');
    Petals.register('backendsearch',    _c.default().server.base + 'backend/dynamic/admin/backendsearch.petal');
};

const loadImageSizes = function () {
    const imageSize = require('./imageSize.js');

    imageSize.add("mini", 48, 48);
    imageSize.add("thumbnail", 150, 150);
    imageSize.add("square", 320, 320);
    imageSize.add("thumbnailarchive", 380, 200);
    imageSize.add("content", 640, '*');

    hooks.fire('image_sized_loaded');
};

const loadPlugins = function (cb) {
    const plugins = require('./plugins.js');

    log('Plugins', 'Loading plugins');
    plugins.init(() => {
        log('Plugins', 'Loaded plugins');

        hooks.fire('plugins_loaded');
        cb && cb();
    });
};

const loadRoles = function (cb) {
    const entities = require('./entities.js');
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

const gracefullyCrash = function(err) {
    const stack = err.stack.split('\n');

    log('Core', '------------------------------------------------', 'detail');
    log('Core', 'Exception made its way to core process', 'err');
    log('Core', '------------------------------------------------', 'detail');
    log('Core', 'Error stack : ' + err, 'err');
    for (let i = 1; i < stack.length; i++) {
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

const bindCrash = function() {
    if ( process.env.handleError != "crash" ) {
        process.on('uncaughtException', gracefullyCrash);
    }
};

const loadStandardInput = function () {
    const stdin = process.openStdin();
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

const loadCacheInvalidator = function () {
    log("CacheInvalidator", 'Initializing cacheInvalidator', 'info');
    const cacheInvalidator = require('./cacheInvalidator.js');
    cacheInvalidator.init(function () {
        log("CacheInvalidator", 'Ready to invalidate cached files', 'success');
    });
};

const scheduleGC = function () {
    log('GC', 'Scheduling temporary file collection', 'info');
    const scheduler = require('./scheduler.js');
    scheduler.schedule('GCcollecttmp', {
        every: {
            secondCount: 1000 * 60 * 60
        }
    }, function () {
        const GC = require('./gc.js');
        GC.clearTempFiles(function () {
            log("GC", "Scheduled temporary files collection done", 'success');
        });
    });
};

const loadLiveVars = function () {
    require('./backend/admin.js').registerLiveVar();
    require('./notifications.js').registerLiveVar();
    require('./backend/search.js').registerLiveVar();

    const Livevars = require('./livevars.js').init();
    Livevars.registerDebugEndpoint();
    log('Core', 'Loaded live variables', 'success');
};

const loadTables = function () {
    require('./tableBuilder.js').init();
}

const loadForms = function () {
    const Forms = require('./forms');
    const formBuilder = require('./formBuilder.js');
    const LoginLib = require('./backend/login.js');

    formBuilder.init();
    Forms.init();
    LoginLib.registerLoginForm();

    hooks.fire('forms_init');
};

const loadNotifications = function () {
    require('./notifications.js').init();
}

const notifyAdminsViaEmail = function() {
    if (!isElder) { return; }

    const _c = require('./config');
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

const loadFrontend = function () {
    log('Frontend', 'Registering default values from core', 'info');
    const Frontend = require('./frontend.js');
    Frontend.registerFromCore();
    hooks.fire('frontend_registered');
};

const prepareDefaultSiteCreation = function (cb) {
    require('./init.js')(cb);
};

const loadWebsites = function (loadEverything) {
    sites = require('./sites.js');

    const currentRoot = __dirname;
    const fss = require('./fileserver.js');

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

const loadLMLLibs = function () {
    hooks.trigger('will_load_core_lml_libs');
    const dashboard = require('./dashboard.js');
    dashboard.registerLMLLib();
    hooks.trigger('loaded_core_lml_libs');
};

const precompile = function (done) {
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

const redirectIfInit = function (resp, cb) {
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

const bindLocalCast = function() {
    const localcast = require('./localcast.js');
    localcast.init();
    localcast.bind('lilium', function(payload) {
        log('Core', 'New process spawned with pid : ' + payload.from, 'info');
    });

    localcast.broadcast('lilium', {
        initialized : true
    });
};

const loadDocs = function(cb) {
    if (global.liliumenv.mode == "script") {
        return cb();
    }

    const docs = require('./docs.js');
    docs.compileDirectory(function() {
        docs.compileIndex(cb);
    });
};

const loadVocab = function(done) {
    const vocab = require('./vocab.js');
    vocab.preloadDicos(done);
};

const loadScriptMode = function() {
    if (global.liliumenv.mode == "script") {
        const scriptpath = global.liliumenv.script;
        if (scriptpath) {
            require(scriptpath);
        }
    }
};

const loadEnv = function() {
    log("Core", "Loading Lilium environment variables", "info");
    global.liliumenv = global.liliumenv || {};
    let total = 0;

    const argv = process.argv.splice(2);
    for (var i = 0; i < argv.length; i++) {
        var split = argv[i].split("=");
        global.liliumenv[split[0]] = split[1];
        total++;
    }

    const env = process.env;
    for (var k in env) {
        global.liliumenv[k] = env[k];
        total++;
    }

    log('Core', `Loaded ${total} env variables.`);
};

const executeRunScript = function() {
    if (global.liliumenv.mode == "script") {
        global.liliumenv.run && global.liliumenv.run.apply(require('./config.js'), [__dirname]);
    }
}

const loadBackendSearch = function() {
    const backendSearch = require('./backend/search.js');
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

const maybeRunCAIJ = () => {
    console.log(process.env.job);
    if (process.env.job == "caij") {
        log('Core', 'Creating CAIJ server', 'lilium');
        require('./caij/caij.js').createServer();
    } else if (isElder) {
        require('./config.js').eachSync(function(_c) {
            require('./caij/caij.js').scheduleTask("refreshTopicLatests", {
                siteid : _c.id,
                origin : "Elder"
            });
        });
    }
}

module.exports = new Core();
