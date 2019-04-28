const Controller = require('../base/controller');
var Admin = require('../backend/admin.js');
const filelogic = require('../pipeline/filelogic');
var lml = require('../lml/lml.js');
var LML2 = require('../lml/compiler.js');
var notif = require('../lib/notifications.js');
var configs = require('../lib/config');
var fs = require('fs');
var db = require('../lib/db.js');

class DevTools extends Controller {
    adminGET (cli) {
        if (!cli.hasRightOrRefuse("develop")) {return;} 

        switch (cli.routeinfo.path[2]) {
            case 'livevars':
            case 'lml':
            case 'endpoints':
            case 'impersonate':
            case 'html':
            case 'sharedobject':
            case 'server':
            case 'scripts':
            case 'hits':
            case 'mail':
            case 'unlink':
            case 'wordpress':
            case 'where':
            case undefined:
                filelogic.serveAdminLML(cli);
                break;

            case 'lml3':
            case 'api':
            case 'preact':
            case 'cache':
            case 'decorations':
                filelogic.serveAdminLML3(cli);
                break;

            default:
                cli.throwHTTP(404, 'Not Found');
        }
    };

    adminPOST (cli) {
        if (!cli.hasRight('develop')) {
            return cli.throwHTTP(401, "401, GET OUT OF MY FACE");
        }

        switch (cli.routeinfo.path[2]) {
            case 'lml': if (cli.routeinfo.path[3] === 'interpret') { interpretLMLToCli(cli); } break;

            case 'wordpressupdate':     updateWordpress(cli); break;
            case 'wptransfer':          transferWPFromOrigin(cli); break;
            case 'clearlml3':           clearLML3Cache(cli); break;
            case 'unlink':              unlinkUpload(cli); break;
            case 'cache':               handleCacheClear(cli); break;
            case 'gencache':            maybeRegenCache(cli); break;
            case 'createcomment':       maybeCreateComment(cli); break;
            case 'initbuild':           maybeInitBuild(cli); break;
            case 'scripts':             maybeExecuteScript(cli); break;
            case 'notifications':       maybeDispatchNotification(cli); break;
            case 'restart':             maybeRestart(cli); break;
            case 'mail':                maybeSendMail(cli); break;

            default:                    cli.refresh();
        }
    };

    livevar (cli, levels, params, cb) {
        cli.touch("devtools.livevar");
        if (!cli.hasRight('develop')) { return cb(); }

        if (levels[0] == "endpoints") { 
            var endpoints = require("../backend/admin.js").getEndpoints();
            var formattedOutput = {};

            for (var method in endpoints) {
                formattedOutput[method] = [];
            
                var curMethod = endpoints[method];
                for (var func in curMethod) {
                    formattedOutput[method].push({
                        endpoint : func,
                        pluginid : curMethod[func].pluginID
                    });
                }
            }

            cb(formattedOutput);
        } else if (levels[0] == "hooks") {
            const allhooks = require('./lib/hooks').debug();
            const resp = {};
            Object.keys(allhooks).forEach(x => { resp[x] = Object.keys(allhooks[x]).length || undefined; });

            cb(resp);
        } else if (levels[0] == "cache") {
            const type = levels[1];

            const skip = params.page || 0;
            const max = 100;

            switch (type) {
                case "posts": 
                    db.findToArray(cli._c, 'content', {status : "published"}, (err, arr) => {
                        cb(arr);
                    }, {title : 1, date : 1, name : 1}, skip * max, max, true);
                    break;

                case "authors":
                    db.findToArray(require('../lib/config').default(), 'entities', {}, (err, arr) => {
                        cb(arr);
                    }, {displayname : 1, slug : 1, username : 1}, undefined, undefined, true);
                    break;

                default: 
                    cb([]);
            }

        } else if (levels[0] == "whereiseveryone") {
            db.findToArray(require('../lib/config').default(), 'entities', {
                geo : {$exists : 1}, 
                "geo.timezone" : {$ne : false}
            }, (err, arr) => {
                cb(arr);
            }, {displayname : 1, geo : 1, avatarURL : 1});
        } else if (levels[0] == "me") {
            cb(cli.userinfo);
        } else if (levels[0] == "livevars") {
            var allLV = require('../pipeline/livevars').getAll();
            var arr = [];

            for (var ep in allLV) {
                arr.push(
                    Object.assign(allLV[ep], {name : ep})
                );
            }

            cb(arr); 
        } else if (levels[0] == "scripts") {
            require('.:/lib/filelogic.js').listDirContent(configs.default().server.base + "scripts/", function(list) {
                cb(list);
            });
        } else if (levels[0] == "htmlfiles") {
            listAllCachedFiles(cli, levels, params, cb);
        }
    };
    
    setup() {
        require('../lib/config').eachSync(_c => {
            require('../make/build').pushToBuildTree(_c, 'devtools', 'devtools', {
                babel : {
                    "plugins": [
                        ["transform-react-jsx", { "pragma":"h" }]
                    ],
                    "presets" : ["es2015"]
                }
            });
        });
    }
    
    form () {
        
    }
}


module.exports = new DevTools();
