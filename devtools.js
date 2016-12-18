var log = require('./log.js');
var Admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');
var lml = require('./lml.js');
var notif = require('./notifications.js');
var formBuilder = require('./formBuilder.js');
var configs = require('./config');
var precomp = require('./precomp.js');

var DevTools = function() {};

var interpretLMLToCli = function(cli) {
    lml.executeFromString(cli._c.server.base + "/backend/dynamic/admin/", cli.postdata.data.lml, function(html) {
        cli.sendJSON({
            html: html
        });
    }, {
        config : cli._c,
        fromClient : true
    });
};

var handleGET = function(cli) {
    if (!cli.hasRightOrRefuse("develop")) {return;} 

    switch (cli.routeinfo.path[2]) {
        case 'livevars':
        case 'lml':
        case 'endpoints':
        case 'cache':
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
                case 'refresh': refreshCache(cli, cli.routeinfo.path[4]);
                case 'clear': clearCache(cli, cli.routeinfo.path[4]);
            }
            break;
        default:
            cli.refresh();
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
            cli.response.end(err || 'ok');
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
    }
    cli.response.end('');
};

var parseContentAds = function(cli) {
    var pcount = cli._c.content.adsperp;
    var db = require('./includes/db.js');
    log('Devtools', 'Parsing ads for all articles', 'info');
    if (pcount) {
        var adtag = "<ad></ad>";
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
                    var content = arr[index].content ? arr[index].content
                        .replace(/\<ad\>\<?\/?a?d?\>?/g, "")
                        .replace(/\<lml\:ad\>/g, "")
                        .replace(/\<\/lml\:ad\>/g, "")
                        .replace(/\<p\>\&nbsp\;\<\/p\>/g, "")
                        .replace(/\n/g, "").replace(/\r/g, "")
                        .replace(/\<p\>\<\/p\>/g, "") : "";

                    var pind = 0;
                    var sind = 0;
                    var changed = false;
                    while ((pind = content.indexOf('</p>', pind)) != -1) {
                        pind += 4;
                        sind++;
                        if (sind == pcount) {
                            content = content.substring(0, pind) + adtag + content.substring(pind);
                            pind += adtag.length;
                            sind = 0;
                            changed = true;
                        }
                    }

                    if (changed) {
                        var perc = (index / arr.length * 100).toFixed(2);
                        log('Devtools', "["+perc+"%] Insert ads inside article with title " + arr[index].title, 'success');
                        db.update(cli._c, 'content', {_id : arr[index]._id}, {content : content}, next);
                    } else {
                        next();
                    }
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
};

module.exports = new DevTools();
