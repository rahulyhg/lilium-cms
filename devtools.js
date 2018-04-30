var log = require('./log.js');
var Admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');
var lml = require('./lml.js');
var LML2 = require('./lml/compiler.js');
var notif = require('./notifications.js');
var formBuilder = require('./formBuilder.js');
var configs = require('./config');
var precomp = require('./precomp.js');
var fs = require('fs');
var db = require('./includes/db.js');

class DevTools {
    adminGET (cli) {
        if (!cli.hasRightOrRefuse("develop")) {return;} 

        switch (cli.routeinfo.path[2]) {
            case 'livevars':
            case 'lml':
            case 'endpoints':
            case 'impersonate':
            case 'feed':
            case 'html':
            case 'sharedobject':
            case 'server':
            case 'scripts':
            case 'hits':
            case 'mail':
            case 'unlink':
            case 'where':
            case undefined:
                filelogic.serveAdminLML(cli);
                break;

            case 'lml3':
            case 'api':
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
            case 'lml':
                if (cli.routeinfo.path[3] === 'interpret') {
                    interpretLMLToCli(cli);
                }
                break;
            case 'clearlml3':
                clearLML3Cache(cli);
                break;
            case 'unlink':
                unlinkUpload(cli);
                break;
            case 'cache':
                handleCacheClear(cli);
                break;
            case 'gencache':
                maybeRegenCache(cli);
                break;
            case 'scripts':
                maybeExecuteScript(cli);
                break;
            case 'feed':
                maybeInsertFeed(cli);
                break;
            case 'restart':
                maybeRestart(cli);
                break;
            case 'mail':
                maybeSendMail(cli);
                break;
            default:
                cli.refresh();
        }
    };

    livevar (cli, levels, params, cb) {
        cli.touch("devtools.livevar");
        if (!cli.hasRight('develop')) { return cb(); }

        if (levels[0] == "endpoints") { 
            var endpoints = require("./backend/admin.js").getEndpoints();
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
            const allhooks = require('./hooks').debug();
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
                    db.findToArray(require('./config.js').default(), 'entities', {}, (err, arr) => {
                        cb(arr);
                    }, {displayname : 1, slug : 1, username : 1}, undefined, undefined, true);
                    break;

                case "topics":
                    db.findToArray(cli._c, 'topics', {}, (err, arr) => {
                        cb(arr);
                    }, {displayname : 1, slug : 1}, undefined, undefined, true);
                    break;

                default: 
                    cb([]);
            }

        } else if (levels[0] == "whereiseveryone") {
            db.findToArray(require('./config').default(), 'entities', {
                geo : {$exists : 1}, 
                "geo.timezone" : {$ne : false}
            }, (err, arr) => {
                cb(arr);
            }, {displayname : 1, geo : 1, avatarURL : 1});
        } else if (levels[0] == "me") {
            cb(cli.userinfo);
        } else if (levels[0] == "livevars") {
            var allLV = require('./livevars.js').getAll();
            var arr = [];

            for (var ep in allLV) {
                arr.push(
                    Object.assign(allLV[ep], {name : ep})
                );
            }

            cb(arr); 
        } else if (levels[0] == "scripts") {
            require('./fileserver.js').listDirContent(configs.default().server.base + "scripts/", function(list) {
                cb(list);
            });
        } else if (levels[0] == "htmlfiles") {
            listAllCachedFiles(cli, levels, params, cb);
        }
    };
    
    
    form () {
        formBuilder.createForm('devtools_livevar', {
            formWrapper: {
                'tag': 'div',
                'class': 'row',
                    'id': 'article_new',
                    'inner': true
                },
            fieldWrapper : "lmlform-fieldwrapper"
        })
        .add('endvar', 'livevar', {
            displayname : "End Variable",
            title: 'name',
            template: 'option', 
            tag: 'select', 
            endpoint: 'devtools.livevars.all',
            attr : {
                lmlselect : false
            },
            props: {
                value: 'name',
                html : 'name',
                header : 'Select One'
            }
        })
        .add('levels', 'stack', {
            scheme : {
                columns : [
                    {
                        fieldName : "level",
                        dataType : "text",
                        displayname : "Level"
                    }
                ]
            },
            displayname : "Levels"
        })
        .add('params', 'stack', {
            scheme : {
                columns : [
                    {
                        fieldName : "paramname",
                        dataType : "text",
                        displayname : "Name"
                    },
                    {
                        fieldName : "paramvalue",
                        dataType : "text",
                        displayname : "Value"
                    }
                ]
            },
            displayname : "Parameters"
        })
        .add('query-set', 'buttonset', { buttons: [{
                name : 'query', 
                displayname : 'Query', 
                classes : ['btn-query']
            }
        ]});

        formBuilder.createForm('devmail', {
            async : true,
            fieldWrapper : 'lmlform-fieldwrapper'
        })
        .add('to', 'text', {
            displayname : "To"
        })
        .add('subject', 'text', {
            displayname : "Subject"
        })
        .add('content', 'textarea', {
            displayname : "Content"
        })
        .add('send-set', 'buttonset', { buttons: [{
                name : 'sendmail', 
                displayname : 'Send Mail', 
                classes : ['btn-sendmail']
            }
        ]});


        formBuilder.createForm('devfeedinsert', {
            async : true,
            fieldWrapper : 'lmlform-fieldwrapper'
        })
        .add('type', 'select', {
            displayname : "Type",
            datasource : [
                {name : "quote", displayName : "Quote"},
                {name : "published", displayName : "Published"},
                {name : "badge", displayName : "Badge"},
                {name : "welcomed", displayName : "Welcomed"}
            ]
        })
        .add('extid', 'text', {
            displayname : "External ID"
        })
        .add('actor', 'livevar', {
            displayname : "Actor",
            endpoint : "entities.chat",
                tag : "select",
                template: "option",
                attr: {
                    lmlselect : false,
                    header : 'Select an entity'
                },
                props: {
                    'value' : "_id",
                    'html' : 'displayname'
                }            
        })
        .add('site', 'livevar', {
                displayname : "Site",
                endpoint : "sites.all.complex",
                tag : "select",
                template: "option",
                attr: {
                    lmlselect : false,
                    header : 'Select a website'
                },
                props: {
                    'value' : "id",
                    'html' : 'website.sitetitle'
                }            
        })
        .add('extra', 'stack', {
            displayname : "Extra data",
            scheme : {
                columns : [
                    { fieldName : "key", dataType : "text", displayname : "Key" },
                    { fieldName : "value", dataType : "text", displayname : "Value" }
                ]
            }
        })
        .add('Insert', 'submit', {
            type: 'button', 
            displayname : 'Insert',
            async : true
        });

        formBuilder.createForm('devtools_api', {
            formWrapper: {
                'tag': 'div',
                'class': 'row',
                    'id': 'devtools_api',
                    'inner': true
                },
            fieldWrapper : "lmlform-fieldwrapper",
            async : true
        })
        .add('endpoint', 'text', {
            displayname : 'API Endpoint'
        })
        .add('method', 'select', {
            displayname : "Method",
            datasource : [
                {displayName : "GET",  name : "GET" },
                {displayName : "POST", name : "POST"}
            ]
        })
        .add('token', 'text', {
            displayname : "User Token"
        })
        .add('hash', 'text', {
            displayname : "Hash header"
        })
        .add('send', 'button', {
            displayname : "Send request",
            callback : "sendDevtoolsAPIRequest"
        });
    }
}

var unlinkUpload = function(cli) {
    const url = cli.postdata.data.url;
    const filename = url.split('/').pop().split('_')[0];
    const hooks = require('./hooks');

    db.findUnique(cli._c, 'uploads', { filename }, (err, entry) => {
        if (entry) {
            let fullpath = entry.path;
            let totalFiles = 1;
            fs.unlinkSync(fullpath);

            Object.keys(entry.sizes).forEach(size => {
                fs.unlinkSync(entry.sizes[size].path);
                totalFiles++;
            });

            db.remove(cli._c, 'uploads', { _id : entry._id }, () => {
                cli.sendJSON({ unlinked : true, entry, total : totalFiles });
            });

            hooks.fire('file_did_unlink', { entry, cli, files : Object.keys(entry.sizes).map(x => entry.sizes[x].path) });
        } else {
            cli.sendJSON({ unlinked : false });
        }
    });
}


var handleCacheClear = function(cli) {
    const type = cli.routeinfo.path[3];
    if (type == "homepage") {
        require('./hooks.js').fire('homepage_needs_refresh_' + cli._c.uid, {
            _c : cli._c, callback : function() {
                cli.sendJSON({done : true});
            }
        });
    }
};

var interpretLMLToCli = function(cli) {
    LML2.compileToString(cli._c.id, cli.postdata.data.lml, {config : cli._c, fromClient : true}, function(html) {
        cli.sendJSON({
            html: html
        });
    });
};

var restartPM2 = function(cli) {
    if (cli.hasRightOrRefuse('lilium')) {
        require('child_process').exec('pm2 restart lilium');
    }
};

var preloadCache = function(cli) {
    require('./cacheInvalidator.js').preloadLatests(cli._c);
};

var dispatchMagicLink = function(cli) {
    require('./entities.js').sendMagicLinkToEveryone(cli, function() {
        cli.sendJSON({success : true});
    });
};

var maybeRegenCache = function(cli) {
    if (cli.hasRightOrRefuse('admin')) {
        cli.sendJSON({ok : 1});

        const now = Date.now();
        const total = isNaN(cli.routeinfo.path[3]) ? 1000000 : parseInt(cli.routeinfo.path[3]);
        db.join(cli._c, 'content', [
            { $match : { status : "published" } },
            { $sort : { _id : -1 } },
            { $limit : total }
        ], arr => {
            const ids = arr.map(x => x._id);
            const contentlib = require('./content');
            
            let i = -1;
            const doOne = () => {
                const _id = ids[++i];
                if (_id) {
                    setTimeout(() => {
                        contentlib.getFull(cli._c, _id, fullarticle => {
                            contentlib.generate(cli._c, fullarticle, () => doOne());
                        });
                    }, 0);
                } else {
                    notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        title: "HTML Cache",
                        msg : ids.length + " articles were regenerated in " + (Date.now() - now) + "ms",
                        type: "success"
                    });
                }
            };

            doOne();
        });
    }
};

var maybeSendMail = function(cli) {
    var mailer = require('./mail.js');
    var data = cli.postdata.data;

    log('Devtools', 'Testing email with data ' + JSON.stringify(data));
    if (data.to && data.subject && data.content) {
        var email = mailer.createEmail(cli._c, data.to, data.subject, data.content);
        email.setHTML(data.content);

        mailer.send(email, function(err) {
            cli.sendJSON({success : !err, error : err});
        });
    } else {
        cli.sendJSON({success : false, error : "Missing fields"});
    }
};

var clearCache = function(cli, ctx) {
    var child_process = require('child_process');

    switch (ctx) {
        case 'html':
            var sites = configs.getAllSites();
            for (var i = 0; i < sites.length; i++) {
                child_process.exec('rm -rf ' + sites[i].server.html + '/*.html', function(err) {
                    notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        title: "HTML Cache",
                        msg : err || "HTML files were successfully invalidated and destroyed.",
                        type: err ? "error" : "success"
                    });
                });
            }
            cli.response.end('1');
            break;
        case 'admin':
            var sites = configs.getAllSites();
            var i = 0;

            cli.response.end('ok');
            var nextSite = function() {
                if (i == sites.length) {
                    return notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        title: "Admin Cache",
                        msg : "Admin cache files were successfully invalidated and destroyed for all " + i + " sites.",
                        type: "success"
                    });
                }

                var site = sites[i];
                child_process.exec('rm -rf ' + site.server.html + '/admin/*', function(err) {
                    child_process.exec('rm -rf ' + site.server.html + '/login/*', function(err) {
                        i++;
                        nextSite();
                    });
                });
            };
            nextSite();

            break;
        default:
            cli.response.end("");
    }
};

var clearLML3Cache = function(cli) {
    Object.keys(require.cache).filter(x => x.endsWith('lml3') || x.endsWith('petal3')).forEach(file => {
        delete require.cache[file];
    });
    
    cli.sendJSON({ok : 1})
};

var maybeInsertFeed = function(cli) {
    var dat = cli.postdata.data;
    var extra = {};
    for (var i in dat.extra) {
        extra[dat.extra[i].key] = dat.extra[i].value;
    }

    require('./feed.js').push(dat.extid, require('./includes/db.js').mongoID(dat.actor), dat.type, dat.site, extra, function() {
        cli.sendJSON(dat);
    });
};

var unwrapImages = function(cli) {
    log('Devtools', 'Unwrapping all images from <p> tags');
    var db = require('./includes/db.js');
    db.find(cli._c, 'content', {}, [], function(err, cur) {
        var done = function() {
            log('Devtools', 'Done unwrapping articles');
        };

        var next = function() {
            cur.hasNext(function(err, hasnext) {
                if (hasnext) {
                    cur.next(function(err, article) {
                        var dom = new require('jsdom').JSDOM(article.content);
                        var window = dom.window;

                        ps = window.document.querySelectorAll('p');
                        var changed = 0;

                        for (var i = 0; i < ps.length; i++) {
                            var p = ps[i];
                            if (p.querySelector('img')) {
                                var img = p.querySelector('img');
                                img.classList.add("lml-content-image");
                                p.outerHTML = '<div class="lml-image-wrapper lml-content-image-wrapper">' + 
                                    img.outerHTML + 
                                    "</div>";

                                changed++;
                            }
                        };

                        log('Devtools', 'Unwrapped ' + changed + ' images for article ' + article.title);
                        db.update(cli._c, 'content', 
                            {_id : article._id}, 
                            {content : window.document.documentElement.innerHTML}, 
                        function() {
                            next();
                        });
                    });
                } else {
                    done();
                }
            });
        };
    
        next();
    });
};

var refreshCache = function(cli, ctx) {
    switch (ctx) {
        case 'tags':
            require('./article.js').refreshTagSlugs(cli._c, function() {
                notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                    title: "Tagging",
                    msg : "Article tag slugs were successfully reassigned",
                    type: "success"
                });
            });
            break;

        case 'hp':
            require('./hooks.js').fire('homepage_needs_refresh_' + cli._c.uid, {
                cli : cli
            });

            notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                title: "Caching",
                msg : "Homepage was flagged as needing to be refreshed.",
                type: "success"
            });
            break;
        case 'entityslug':
            require('./entities.js').refreshSlugs(cli, function(updated) {
                notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                    title: "Entities",
                    msg : "Refreshed " +updated + " entities slug.",
                    type: "success"
                });
            });
            break;
        case 'instagram':
            require('./embed.js').scanInstagram(cli);
            break;
        case 'insertads':
            parseContentAds(cli);
            break;
        case 'precompile':
            recompileQueue(cli);
            break;
        case 'unwrapimgs':
            unwrapImages(cli);
            break;
    }
    cli.response.end('');
};

var runScript = function(cli, name) {
    log('Devtools', "Executing script : " + name);

    delete require.cache[require.resolve('./scripts/' + name)];
    require('./scripts/' + name)(cli);
}

var maybeRestart = function(cli) {
    if (cli.hasRight('develop')) {
        restartLilium(cli);
    } else {
        cli.sendJSON({ok : false, message : "nope"});
    }
};

var restartLilium = function(cli) {
    cli.sendJSON({ok : true, message : "restart"});
    process.send("updateAndRestart", () => {})
}

var maybeExecuteScript = function(cli) {
    if (cli.hasRightOrRefuse("develop")) {
        runScript(cli, cli.routeinfo.path[3] + ".js");
        cli.sendJSON({executed : true});
    }
};

var listAllCachedFiles = function(cli, levels, params, cb) {
    var dirPath = cli._c.server.html;
    require('./fileserver.js').listDirContent(dirPath, function(rootarr) {
        require('./fileserver.js').listDirContent(dirPath + "/next", function(nextarr) {
            require('./fileserver.js').listDirContent(dirPath + "/tags", function(tagsarr) {
                require('./fileserver.js').listDirContent(dirPath + "/category", function(catarr) {
                    require('./fileserver.js').listDirContent(dirPath + "/author", function(autharr) {
                        require('./fileserver.js').listDirContent(dirPath + "/search", function(serarr) {
                            rootarr = rootarr.filter(function(obj) { return obj.indexOf(".html") !== -1 });
                            cb({
                                html : rootarr,
                                next : nextarr,
                                tags : tagsarr,
                                category : catarr,
                                author : autharr,
                                search : serarr
                            });
                        });
                    });
                });
            });
        });
    });
};

var parseContentAds = function(cli) {
    var pcount = cli._c.content.adsperp;
    var db = require('./includes/db.js');
    var jsdom = require("jsdom");
    log('Devtools', 'Parsing ads for all articles', 'info');
    if (pcount) {
        db.findToArray(cli._c, 'content', {}, function(err, arr) {
            var index = -1;
            var next = function() {
                index++;
                if (index == arr.length) {
                    log('Devtools', '[100.0%] Finished ads insertion', 'success');
                    notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        title : "Content ads",
                        msg : "Parsed all " + index + " articles, inserting ads every " + pcount + " paragraphs.",
                        type : "success"
                    });
                } else {
                    require('./article.js').insertAds(cli._c, arr[index], next);
                }
            };

            next();
        });
    } else {
        notif.notifyUser(cli.userinfo.userid, cli._c.id, {
            title : "Content ads",
            msg : "No paragraphs count for ad insertion",
            type : "warning"
        });
    }
};

var recompileQueue = function(cli) {
    require('./config.js').each(function(_c, next) {
        precomp.precompile(_c, function() {
            require('./templateBuilder.js').precompThemeFiles(_c, function() {
                notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                    title: "Precompiler",
                    msg : "Precompiled files for website " + _c.website.sitetitle,
                    type: "success"
                });
                next();
            }, true);
        });
    }, function() {}, undefined, true);
};

module.exports = new DevTools();
