var log = require('./log.js');
var Admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');
var lml = require('./lml.js');
var notif = require('./notifications.js');

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
        return cli.throwHTTP(401, "401 UNAUTHORIZED");
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
    }
};

var clearCache = function(cli, ctx) {
    var child_process = require('child_process');

    switch (ctx) {
        case 'html':
            child_process.exec('rm -rf ' + cli._c.server.html + '/*.html', function(err) {
                cli.response.end(err || 'ok');
                notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                    title: "HTML Cache",
                    msg : err || "HTML files were successfully invalidated and destroyed.",
                    type: err ? "error" : "success"
                });
            });
            break;
        case 'admin':
            child_process.exec('rm -rf ' + cli._c.server.html + '/admin/*', function(err) {
                cli.response.end(err || 'ok');
                notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                    title: "Admin Cache",
                    msg : err || "Admin cache files were successfully invalidated and destroyed.",
                    type: err ? "error" : "success"
                });
            });
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
    }
    cli.response.end('');
};

DevTools.prototype.registerAdminEndpoint = function() {
    Admin.registerAdminEndpoint('devtools', 'GET', handleGET);
    Admin.registerAdminEndpoint('devtools', 'POST', handlePOST);
};

module.exports = new DevTools();
