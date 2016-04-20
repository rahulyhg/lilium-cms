var FileServer = require('./fileserver.js');
var LML = require('./lml.js');
var _c = require('./config.js');
var log = require('./log.js');
var fs = require('fs');
var slugify = require('slug');
var db = require('./includes/db.js');

var FileLogic = function () {
    /*
    	File Logic
    	 * Serve file if it exists
    	 * Check if special page, generate if not present
    	 * Check for redirection
    	 * Throw soft 404 (hard if specified in config)
    */
    var serveCachedFile = function (cli, fullpath) {
        cli.touch('filelogic.serveCachedFile');
        FileServer.serveAbsFile(cli, fullpath);
    };

    this.createHtmlMail = function (path, params, callback) {
        LML.executeToHtml(
            path,
            callback,
            params
        );
    };

    var serveSpecialPage = function (cli, fullpath) {
        cli.touch('filelogic.serveSpecialPage');
        var specialName =
            cli.routeinfo.login ? "login" :
            cli.routeinfo.admin ? "admin" :
            "";

        var readPath = cli._c.server.base + "backend/dynamic/" + specialName + ".lml";
        var savePath = cli._c.server.html + '/' + cli._c.paths[specialName] + '/index.html';

        saveLmlPage(cli, readPath, savePath);
    };

    var serveStaticFile = function (cli, fullpath) {
        cli.touch('filelogix.serveStaticFile');
        cli.debug();
    };

    var redirectUserTo = function (cli) {
        cli.touch('filelogic.redirectUserTo');
        cli.debug();
    };

    var checkForSpecialPage = function (cli) {
        cli.touch('filelogic.checkForSpecialPage');
        return cli.routeinfo.admin || cli.routeinfo.login;
    };

    var checkForRedirection = function (cli) {
        cli.touch('filelogic.checkForRedirection');
        cli.redirectTo = undefined;
        return false;
    };

    /**
     * Serves an lml page, if lastIsParam is true,
     * it will not check for last path[] as the folder name.
     */
    this.serveLmlPage = function (cli, lastIsParam, extra) {
        lastIsParam = typeof lastIsParam == 'undefined' ? false : lastIsParam;
        var name = "";

        if (lastIsParam) {
            name = cli.routeinfo.relsitepath.replace('/' + cli.routeinfo.path.pop(), '');
        } else {
            name = cli.routeinfo.relsitepath;
        }

        var readPath = cli._c.server.base + "backend/dynamic" + name + ".lml";
        var savePath = cli._c.server.html + name + '/index.html';
        FileServer.fileExists(savePath, function (isPresent) {
            if (!isPresent) {
                saveLmlPage(cli, readPath, savePath, extra);
            } else {
                serveCachedFile(cli, savePath);
            }

        });
    };

    this.serveAdminLML = function (cli, lastIsParam, extra, templatefile, dynamicroot) {
        lastIsParam = typeof lastIsParam == 'undefined' ? false : lastIsParam;
        var name = "";

        if (lastIsParam) {
            name = cli.routeinfo.relsitepath.replace('/' + cli.routeinfo.path.pop(), '');
        } else {
            name = cli.routeinfo.relsitepath;
        }

        var readPath = cli._c.server.base + (dynamicroot || "backend/dynamic") + name + ".lml";
        var savePath = cli._c.server.html + name + '/index.html';
        var tmpPath = cli._c.server.html + "/static/tmp/" + (Math.random()).toString().substring(2) + ".admintmp";
        var adminPath = cli._c.server.base + (templatefile || "backend/dynamic/admintemplate.lml");

        FileServer.fileExists(savePath, function (isPresent) {
            if (!isPresent) {
                LML.executeToFile(
                    readPath,
                    tmpPath,
                    function () {
                        LML.executeToFile(
                            adminPath,
                            savePath,
                            function () {
                                FileServer.pipeFileToClient(cli, savePath, function () {
                                    log('FileLogic', 'Admin page generated and served');
                                });
                            }, {
                                templatefile: tmpPath,
                                config: cli._c
                            }
                        );
                    }, {
                        config: cli._c
                    }
                );
            } else {
                serveCachedFile(cli, savePath);
            }
        });
    };

    this.compile = function(path, cb, extra) {
        LML.executeToHtml(readPath, cb, extra);
    };

    this.serveLmlPluginAdminPage = function (pluginName, cli, lastIsParam, extra) {
        lastIsParam = typeof lastIsParam == 'undefined' ? false : lastIsParam;
        var name;

        if (lastIsParam) {
            name = cli.routeinfo.fullpath.replace('/' + cli.routeinfo.path.pop(), '');
        } else {
            name = cli.routeinfo.fullpath;
        }

        var readPath = cli._c.server.base + "plugins/" + pluginName + "/dynamic" + name + ".lml";
        var savePath = cli._c.server.html + name + '/index.html';
        var tmpPath = cli._c.server.html + "/static/tmp/" + (Math.random()).toString().substring(2) + ".admintmp";
        var adminPath = cli._c.server.base + "backend/dynamic/admintemplate.lml";

        FileServer.fileExists(savePath, function (isPresent) {
            if (!isPresent) {
                LML.executeToFile(
                    readPath,
                    tmpPath,
                    function () {
                        LML.executeToFile(
                            adminPath,
                            savePath,
                            function () {
                                FileServer.pipeFileToClient(cli, savePath, function () {
                                    log('FileLogic', 'Admin page generated and served');
                                });
                            }, {
                                templatefile: tmpPath,
                                config: cli._c
                            }
                        );
                    }, {
                        config: cli._c
                    }
                );
            } else {
                serveCachedFile(cli, savePath);
            }

        });
    };

    this.serveLmlPluginPage = function (pluginName, cli, lastIsParam, extra) {
        lastIsParam = typeof lastIsParam == 'undefined' ? false : lastIsParam;
        var name;

        if (lastIsParam) {
            name = cli.routeinfo.relsitepath.replace('/' + cli.routeinfo.path.pop(), '');
        } else {
            name = cli.routeinfo.relsitepath;
        }

        var readPath = cli._c.server.base + "plugins/" + pluginName + "/dynamic" + name + ".lml";
        var savePath = cli._c.server.html + name + '/index.html';

        FileServer.fileExists(savePath, function (isPresent) {
            if (!isPresent) {
                saveLmlPage(cli, readPath, savePath, extra);
            } else {
                serveCachedFile(cli, savePath);
            }

        });
    };

    var getPostElements = function(cli, extra, cb) {

        db.findToArray(cli._c, 'entities', {_id : db.mongoID(extra.author)}, function(err, res){
            if (res[0]) {
                extra.author = res[0];
            }
            db.findToArray(cli._c, 'uploads', {_id: db.mongoID(extra.media)}, function(err, res) {
                if (res[0]) {
                    extra.media = res[0];
                }
                db.aggregate(cli._c, 'content', [{$match: {_id : {$ne : db.mongoID(extra._id)}}}, {$sample : {size: 3}}, {$project: {name: 1, title: 1}}], function(res) {
                    if (res) {
                        extra.morefromsite = res;
                    }
                    cb(extra);
                });
            });

        });
    };

    this.renderLmlPostPage = function (cli, postType, extra, cb) {
        var theme = require('./themes.js');
        extra = extra || new Object();
        extra.config = cli._c;
        getPostElements(cli, extra, function(extra) {
            // Check for the post type
            var title = slugify(extra.title).toLowerCase();
            var readPath = cli._c.server.base + "flowers/" + theme.getEnabledTheme(cli._c).info.path + "/" + postType + ".lml";
            var savePath = cli._c.server.html + "/" + title + ".html";
            LML.executeToFile(
                readPath,
                savePath,
                function () {
                    cli.responseinfo.filecreated = true;
                    cb(title + ".html");
                },
                extra
            );
        })

    };

    this.compileLmlPostPage = function (cli, postType, extra, cb) {
        var theme = require('./themes.js');

        var readPath = cli._c.server.base + "flowers/" + theme.getEnabledTheme(cli._c).info.path + "/" + postType + ".lml";
        getPostElements(cli, extra, function(extra) {
            LML.executeToHtml(readPath, cb, extra);
        });
    };

    this.serveAbsoluteLml = function (readPath, savePath, cli, extra) {
        FileServer.fileExists(savePath, function (isPresent) {
            if (isPresent) {
                serveCachedFile(cli, savePath);
            } else {
                log("FileLogic", "Interpreting LML from absolute path : " + readPath);
                extra = extra || new Object();
                extra.config = cli._c;

                LML.executeToFile(readPath, savePath, function () {
                    cli.responseinfo.filecreated = true;
                    serveCachedFile(cli, savePath);
                }, extra);
            }
        });
    };

    var saveLmlPage = function (cli, readPath, savePath, extra) {
        extra = extra || new Object();
        extra.config = cli._c;

        LML.executeToFile(
            readPath,
            savePath,
            function () {
                cli.touch('filelogic.serveSpecialPage.callback');
                cli.responseinfo.filecreated = true;
                serveCachedFile(cli, savePath);
            },
            extra
        );

    };

    this.executeLMLNoCache = function (cli, readPath, extra) {
        var tmpname = cli._c.server.html + "/static/tmp/" + Math.random().toString(36).slice(-12) + ".html";
        saveLmlPage(cli, readPath, tmpname, extra);
    };

    this.runLogic = function (cli) {
        cli.touch('filelogic.runlogic');
        var fullpath = cli._c.server.html + cli.routeinfo.relsitepath;

        // Check for static file
        FileServer.fileExists(fullpath, function (isPresent) {
            if (isPresent) {
                serveCachedFile(cli, fullpath);
            } else if (cli.routeinfo.isStatic) {
                // Static file not found; hard 404
                cli.debug();
            } else if (checkForSpecialPage(cli)) {
                serveSpecialPage(cli, fullpath);
            } else if (checkForRedirection(cli)) {
                redirectUserTo(cli);
            } else {
                cli.debug();
                throw 404;
            }
        });
    };

    var init = function () {

    };

    init();
};

module.exports = new FileLogic();
