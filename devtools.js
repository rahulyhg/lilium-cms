var log = require('./log.js');
var Admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');
var lml = require('./lml.js');
var LML2 = require('./lml/compiler.js');
var notif = require('./notifications.js');
var formBuilder = require('./formBuilder.js');
var configs = require('./config');
var precomp = require('./precomp.js');

var DevTools = function() {};

var interpretLMLToCli = function(cli) {
    LML2.compileToString(cli._c.id, cli.postdata.data.lml, {config : cli._c, fromClient : true}, function(html) {
        cli.sendJSON({
            html: html
        });
    });
};

var handleGET = function(cli) {
    if (!cli.hasRightOrRefuse("develop")) {return;} 

    switch (cli.routeinfo.path[2]) {
        case 'livevars':
        case 'lml':
        case 'endpoints':
        case 'cache':
        case 'feed':
        case 'html':
        case 'server':
        case 'scripts':
        case undefined:
            filelogic.serveAdminLML(cli);
            break;

        default:
            cli.throwHTTP(404, 'Not Found');
    }
};

var handlePOST = function(cli) {
    if (!cli.hasRight('develop')) {
        return cli.throwHTTP(401, "401 GET OUT OF MY FACE");
    }

    switch (cli.routeinfo.path[2]) {
        case 'lml':
            if (cli.routeinfo.path[3] === 'interpret') {
                interpretLMLToCli(cli);
            }
            break;
        case 'cache':
            switch (cli.routeinfo.path[3]) {
                case 'refresh': refreshCache(cli, cli.routeinfo.path[4]); break;
                case 'clear': clearCache(cli, cli.routeinfo.path[4]); break;
                case 'preload' : preloadCache(cli); break;
            }
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
        default:
            cli.refresh();
    }
};

var restartPM2 = function(cli) {
    if (cli.hasRightOrRefuse('lilium')) {
        require('child_process').exec('pm2 restart lilium');
    }
};

var preloadCache = function(cli) {
    require('./cacheInvalidator.js').preloadLatests(cli._c);
}

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
                        require('jsdom').env(article.content, function(err, window) {
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
            var entryfile = require('./themes.js').getEnabledThemeEntry(cli._c);
            var themeFtc = require(entryfile);

            if (themeFtc.clearCache) {
                themeFtc.clearCache('home');
                notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                    title: "Caching",
                    msg : "Homepage was flagged as needing to be refreshed.",
                    type: "success"
                });
            }
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
    require.cache = {};
    // require('./lilium.js').cms();
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

DevTools.prototype.registerAdminEndpoint = function() {
    Admin.registerAdminEndpoint('devtools', 'GET', handleGET);
    Admin.registerAdminEndpoint('devtools', 'POST', handlePOST);
};

DevTools.prototype.registerLiveVar = function() {
    require('./livevars.js').registerLiveVariable("devtools", function(cli, levels, params, cb) {
        cli.touch("devtools.livevar");

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
    }, ["develop"]);
};

DevTools.prototype.registerForms = function() {
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
            classes : ['btn', 'btn-default', 'btn-query']
        }
    ]})

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
    })
};

module.exports = new DevTools();
