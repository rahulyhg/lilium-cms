const hooks = require('./lib/hooks');
const db = require('./lib/db.js');
const isElder = require('./network/info.js').isElderChild();
const V4 = require('./lib/v4');
const OS = require('os');
const ShellServer = require('./cli/server');
const metrics = require('./lib/metrics');

global.require_template = require('./lib/templaterequire');

const v4 = new V4();

class Core {
    constructor() {
        log('Core', 'Lilium core object was created', 'success');
        this.isElder = isElder;
    }
    
    makeEverythingSuperAwesome(readyToRock) {
        log('Core', 'Initializing Lilium', 'lilium');
        loadEnv();
        bindCrash();
        initMetrics();
        initShell();

        const inbound = require('./pipeline/inbound.js')
        inbound.createServer(true);

        require('./includes/caller.js')
        log('Core', 'Loading all websites', 'info');
        loadWebsites((resp) => {
            if (loadScriptMode()) {
                return;
            }

            log('Core', 'Creating global library access', 'lilium');

            global.core = {
                filelogic : require('./pipeline/filelogic'),
                hooks : require('./lib/hooks'),
                entities : require('./lib/entities'),
                livevars : require('./pipeline/livevars'),
                API : require('./pipeline/api'),
                imageResizer : require('./lib/imageResizer'),
                LML3 : require('./lml3/compiler'),
                LML2 : require('./lml/lml'),
                notifications : require('./lib/notifications'),
                scheduler : require('./lib/scheduler'),
                search : require('./lib/search'),
                sharedcache : require('./lib/sharedcache'),
                themes : require('./lib/themes'),
            };

            log('Core', 'Created global library', 'success');

            loadCurrencies();
            maybeRunCAIJ();
            loadHooks(() => readyToRock(this));
            loadEndpoints();
            loadStandardInput();
            loadImageSizes();
            loadLiveVars();
            loadAudiences();
            loadBackendSearch();
            
            loadVocab(() => {
                loadPlugins(() => {
                    loadRoles(() => {
                        redirectIfInit(resp, () => {
                            makeBuild(() => {
                                loadGitHub();
                                require('./riverflow/riverflow.js').loadFlows();

                                inbound.handleQueue();
            
                                loadCacheInvalidator();
            
                                log('Lilium', 'Starting inbound server', 'info');
                                loadNotifications();
                                notifyAdminsViaEmail();
                                executeRunScript();
                                initSchedulingTasks();
                                initLocalcast();
            
                                log('Core', 'Firing initialized signal', 'info');
                                hooks.fire('init');
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
    hooks.init();
    hooks.bind('init', 100, readyToRock);

    hooks.fire('hooks');
    log('Hooks', 'Loaded hooks', 'success');
};

const loadEndpoints = () => {
    if (global.liliumenv.mode == "script" || global.liliumenv.caij) { return; }

    log('Endpoints', 'Loading endpoints', 'info');
    const endpoints = require('./pipeline/endpoints.js');
    const filelogic = require('./pipeline/filelogic');
    const admin = require('./backend/admin.js');
    const entities = require('./lib/entities.js');
    const LoginLib = require('./backend/login.js');

    endpoints.init();
    endpoints.register('*', 'lilium', 'GET', (cli) => {
        cli.userinfo && cli.userinfo.loggedin ? 
            v4.serveV4Index(cli) :
            cli.redirect(cli._c.server.protocol + cli._c.server.url + "/login?to=" + cli.routeinfo.fullpath);
    });

    endpoints.register('*', 'login', 'POST', (cli) => {
        cli.touch("endpoints.POST.login");
        LoginLib.authUser(cli);
    });

    endpoints.register('*', 'magiclink', 'GET', (cli) => {
        cli.touch("endpoints.POST.login");
        LoginLib.magiclink(cli);
    });

    endpoints.register('*', 'admin', 'POST', (cli) => {
        cli.touch("endpoints.POST.admin");
        admin.handleAdminEndpoint(cli);
    });

    endpoints.register('*', 'logout', 'GET', (cli) => {
        cli.touch("endpoints.POST.logout");
        const sessions = require('./lib/session.js');
        sessions.logout(cli);
    });

    admin.registerAdminEndpoint('welcome', 'GET', (cli) => {
        cli.touch('admin.GET.welcome');
        admin.welcome(cli, 'GET');
    });

    admin.registerAdminEndpoint('welcome', 'POST', (cli) => {
        cli.touch('admin.POST.welcome');
        admin.welcome(cli, 'POST');
    });

    admin.registerAdminEndpoint('activities', 'GET', (cli) => {
        cli.touch('admin.GET.activities');
        if (cli.hasRightOrRefuse("entities-act")) {
            filelogic.serveAdminLML(cli, false);
        }
    });

    admin.registerAdminEndpoint('me', 'POST', (cli) => {
        cli.touch('admin.POST.me');
        entities.adminPOST(cli);
    });

    admin.registerAdminEndpoint('me', 'GET', (cli) => {
        cli.touch('admin.GET.me');
        filelogic.serveAdminLML(cli, false);
    });

    hooks.fire('endpoints');
    log('Endpoints', 'Loaded endpoints', 'success');
};

const initShell = () => {
    if (isElder) {
        const shellserver = new ShellServer();
        shellserver.start();
    }
};

const loadImageSizes = () => {
    const imageSize = require('./lib/imageSize.js');

    imageSize.add("mini", 48, 48);
    imageSize.add("thumbnail", 150, 150);
    imageSize.add("square", 320, 320);
    imageSize.add("thumbnailarchive", 380, 200);
    imageSize.add("content", 640, '*');
    imageSize.add("facebook", 1200, 630);

    hooks.fire('image_sized_loaded');
};

const loadCurrencies = () => {
    require('./lib/money').preloadCurrencies();
};

const loadPlugins = (cb) => {
    const plugins = require('./lib/plugins');

    log('Plugins', 'Loading plugins');
    plugins.init(() => {
        log('Plugins', 'Loaded plugins');

        hooks.fire('plugins_loaded');
        cb && cb();
    });
};

const makeBuild = (cb) => {
    if (!isElder) { return cb(); }

    const buildLib = require('./make/build');
    const cssBuildLib = require('./make/cssbuilder');
    const pathLib = require('path');

    buildLib.initialBuild(() => {
        cssBuildLib.build(
            pathLib.join(liliumroot, 'apps', 'lilium', 'less'), 
            pathLib.join(liliumroot, 'backend', 'static', 'compiled', 'v4.css'), 
            { 
                compress : require('./lib/config').default().env == "prod" 
            }, 
        err => {
            err && log('Core', 'Error compiling V4 less files to CSS : ' + err, 'err');
            cb();
        });
    });
};

const loadAudiences = () => {
    if (!isElder) { return; }

    require('./lib/audiences').preload();
};

const loadRoles = (cb) => {
    const entities = require('./lib/entities.js');
    entities.registerRole({
        name: 'admin',
        displayname: 'admin',
    }, ['dash', 'admin'], () => {
        return;
    }, true, true);

    entities.registerRole({
        name: 'lilium',
        displayname: 'lilium',
    }, ['dash', 'admin'], () => {
        return;
    }, true, true);

    cb();
};

const loadGitHub = () => {
    if (!isElder) return;

    require('./lib/github').initialize();
}

const gracefullyCrash = (err) => {
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
    metrics.push('errors', err);

    if (global.__TEST) {
        log('Core', 'Test mode will force Lilium to exit', 'warn');
        require('./network/localcast').fatal(err);
    }
};

const bindCrash = () => {
    if ( process.env.handleError != "crash" ) {
        process.on('uncaughtException', gracefullyCrash);
    }
};

const initLocalcast = () => { 
    require('./network/localcast').init();
}

const loadStandardInput = () => {
    const stdin = process.openStdin();
    stdin.liliumBuffer = "";
    stdin.on('data', (chunk) => {
        setTimeout(() => {
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

const loadCacheInvalidator = () => {
    log("CacheInvalidator", 'Initializing cacheInvalidator', 'info');
    const cacheInvalidator = require('./lib/cacheInvalidator.js');
    cacheInvalidator.init(() => {
        log("CacheInvalidator", 'Ready to invalidate cached files', 'success');
    });
};

const loadLiveVars = () => {
    require('./backend/admin.js').registerLiveVar();
    require('./lib/notifications.js').registerLiveVar();
    require('./backend/search.js').registerLiveVar();

    const Livevars = require('./pipeline/livevars').init();
    Livevars.registerDebugEndpoint();
    log('Core', 'Loaded live variables', 'success');
};

const loadNotifications = () => {
    require('./lib/notifications.js').init();
}

const notifyAdminsViaEmail = () => {
    if (!isElder) { return; }

    const _c = require('./lib/config');
    db.findToArray(_c.default(), "entities", {roles : "lilium"}, (err, users) => {
        users.forEach((user) => {
            if (user.email) {
                require('./lib/mail.js').triggerHook(_c.default(), 'lilium_restarted', user.email, {
                    sigsha : require("crypto-js").SHA256(new Date()).toString(require("crypto-js").enc.Hex),
                    user : user,
                    lmllibs : ["config", "extra", "date"]
                });
            }
        });
    });
};

const prepareDefaultSiteCreation = (cb) => {
    require('./includes/init.js')(cb);
};

const validateNetworkSite = () => {
    try {
        const dconf = require('./sites/default');
        // TODO : More network site validation
    } catch (err) {
        log('Core', "[FATAL] Error in network site config : " + err, 'err');
        return false;
    }
    
    return true;
}

const loadWebsites = (loadEverything) => {
    sites = require('./lib/sites.js');

    const currentRoot = __dirname;
    const fss = require('./pipeline/filelogic');

    log('Core', 'Reading sites directory', 'info');
    fss.dirExists(currentRoot + "/sites", (exists) => {
        if (exists) {
            fss.fileExists(currentRoot + "/sites/default.json", (exists) => {
                if (exists && validateNetworkSite()) {
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

const redirectIfInit = (resp, cb) => {
    if (resp) {
        resp.writeHead(200, {
            "Content-Type": "text/html"
        });
        resp.end(
            '<i>Please wait a moment...</i><script>setTimeout(function() {window.location = "' + resp.redirectTo + '"}, 1000);</script>',
            'utf8',
            () => {
                resp.req.connection.unref();
                resp.req.connection.destroy();
                resp.server.close(cb);
            }
        );
    } else {
        cb();
    }
};

const loadVocab = (done) => {
    const vocab = require('./lib/vocab.js');
    vocab.preloadDicos(done);
};

const loadScriptMode = () => {
    if (global.liliumenv.mode == "script") {
        const scriptpath = global.liliumenv.script;
        if (scriptpath) {
            require(scriptpath);
        }

        return true;
    }
};

const initMetrics = () => {
    metrics.create('requests', 'Requests', 'requests', 'count');
    metrics.create('requestspers', 'Requests per second', 'req/s', 'count');
    metrics.create('dbcalls', 'Database calls', 'calls', 'count');
    metrics.create('loggedinusers', 'Logged-in users', 'users', 'count');
    metrics.create('socketevents', 'Socket events', 'events', 'count');
    metrics.create('authreq', 'Authenticated requests', 'requests', 'count');
    metrics.create('errors', 'Errors', 'errors', 'array');
    metrics.create('ram', 'RAM', 'mb', 'count');
    metrics.create('cpu', 'CPU', '%', 'count');
    metrics.create('failedauth', 'Failed logins', 'logins', 'count');
    metrics.create('lml3compile', 'LML3 file compiled', 'files', 'count');
    metrics.create('evlooplag', 'Event loop lag', 'ms', 'count');
    metrics.create('httplatency', 'HTTP Laency', 'ms', 'avg');
    metrics.create('articles', 'Total articles', 'articles', 'count');
    metrics.create('entities', 'Total entities', 'entities', 'count');
    metrics.create('endpointsreq', 'Request per endpoints', 'requests', 'deep');

    queryMetrics();
};

const queryMetrics = () => {
    setInterval(() => {
        metrics.set('ram', process.memoryUsage().heapUsed / 1024 / 1024);
    }, 2000);

    setInterval(() => {
        metrics.reset('requestspers');

        setImmediate(() => {
            const now = Date.now();

            setImmediate(() => {
                metrics.set('evlooplag', Date.now() - now);
            });
        });
    }, 1000);
}

const loadEnv = () => {
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

    global.liliumenv.caij = process.env.job == "caij";
    global.liliumenv.caij && log('Core', 'Found CAIJ job process environment', 'lilium');

    log('Core', `Loaded ${total} env variables.`);
};

const executeRunScript = () => {
    if (global.liliumenv.mode == "script" || global.liliumenv.caij) {
        global.liliumenv.run && global.liliumenv.run.apply(require('./lib/config'), [__dirname]);
    }
}

const loadBackendSearch = () => {
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

const initSchedulingTasks = () => {
    if (isElder) {
        require('./lib/config').eachSync((_c) => {
            require('./caij/caij.js').scheduleTask("refreshTopicLatests", {
                siteid : _c.id,
                origin : "Elder"
            });
        });
    }
};

const maybeRunCAIJ = () => {
    if (process.env.job == "caij") {
        log('Core', 'Creating CAIJ server', 'lilium');
        require('./caij/caij.js').createServer();
    }
}

module.exports = new Core();
