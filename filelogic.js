var FileServer = fileserver = require('./fileserver.js');
var _c = require('./config.js');
var LML = require('./lml.js');
var LML2 = require('./lml/compiler.js');
var log = require('./log.js');
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

    this.serveErrorPage = function(cli, code) {
        this.serveRelativeLML(cli, 'http/' + code, {});
    };

    this.serveRelativeLML = function(cli, path, extra) {
        var savePath = cli._c.server.html + "/" + path + '/index.html';
        FileServer.fileExists(savePath, function (isPresent) {
            var readPath = cli._c.server.base + "backend/dynamic/" + path + ".lml";
            if (!isPresent) {
                saveLmlPage(cli, readPath, savePath, extra);
            } else {
                serveCachedFile(cli, savePath);
            }
        });
    };

    this.serveAdminTemplate = function(cli, extra, templatefile, cb) {
        var adminPath = cli._c.server.base + (templatefile || "backend/dynamic/admintemplate.lml"); 
        var savePath = cli._c.server.html + "/admin/_index.html";
        FileServer.fileExists(savePath, function (isPresent) {
            if (isPresent) { 
                serveCachedFile(cli, savePath);
            } else {
                FileServer.readFile(adminPath, function(content) {
                    FileServer.createDirIfNotExists(savePath, function() {
                        var output = FileServer.getOutputFileHandle(savePath);
                        extra = extra || {};
                        extra.rootDir = adminPath.substring(0, adminPath.lastIndexOf('/'));
                        extra.config = cli._c;
    
                        var now = new Date();
                        log('LML2', "Compiling file from " + adminPath, 'info');
                        LML2.compile(cli._c.id, content, output, extra, function() {
                            FileServer.pipeFileToClient(cli, savePath, function () {
                                log('FileLogic', 'Admin template page generated and served in ' + (new Date - now) + "ms", 'success');
                                cb && cb();
                            });
                        });
                    });
                }, false, 'utf8');
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

        var savePath = cli._c.server.html + name + '/index.html';
        FileServer.fileExists(savePath, function (isPresent) {
            var readPath = cli._c.server.base + (dynamicroot || "backend/dynamic") + name + ".lml";
            if (!isPresent) {
                FileServer.readFile(readPath, function(content) {
                    if (!content) {
                        cli.throwHTTP(404);
                    } else {
                        FileServer.createDirIfNotExists(savePath, function() {
                            var output = FileServer.getOutputFileHandle(savePath);
                            extra = extra || {};
                            extra.rootDir = readPath.substring(0, readPath.lastIndexOf('/'));
                            extra.config = cli._c;
        
                            var now = new Date();
                            log('LML2', "Compiling file from " + readPath, 'info');
                            LML2.compile(cli._c.id, content, output, extra, function() {
                                FileServer.pipeFileToClient(cli, savePath, function () {
                                    log('FileLogic', 'Admin page generated and served in ' + (new Date - now) + "ms", 'success');
                                });
                            });
                        });
                    }
                }, false, 'utf8');
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
                                    log('FileLogic', 'Admin page generated and served', 'success');
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

    this.renderNextLML = function(cli, preferredFileName, extra, callback) {
        var savePath = cli._c.server.html + "/next/" + preferredFileName;
        var tmpPath = cli._c.server.html + "/static/tmp/" + (Math.random()).toString().substring(2) + ".nexttmp";

        FileServer.fileExists(savePath, function (isPresent) {
            if (isPresent) {
                FileServer.pipeFileToClient(cli, savePath, function() {}, true, "text/html; charset=utf8");
            } else {
                var theme = require('./themes.js');
                extra = extra || new Object();
                extra.config = cli._c;
                extra.contextname = "next";
                extra.siteid = cli._c.id;

                theme.fetchCurrentTheme(cli._c, function(cTheme) {
                    extra.theme = cTheme;
                    extra.minify = true;

                    var readPath = cli._c.server.base + "flowers/" + cTheme.uName + "/" + cTheme.contexts.next;

                    log('FileLogic', 'Compiling context theme page for article without layout', 'info');
                    LML2.compileToFile(
                        readPath,
                        tmpPath,
                        function () {
                            require('./fileserver.js').readFile(tmpPath, function(ctn) {
                                log('FileLogic', 'Passing content through CDN', 'detail');

                                require('./cdn.js').parse(ctn, cli, function(cdned) { 
                                    log('FileLogic', 'Parsed content', 'success');
                                    var handle = FileServer.getOutputFileHandle(savePath, 'w+');
                                    FileServer.writeToFile(handle, cdned, function() {
                                        log('FileLogic', 'Cache file was created at ' + savePath, 'success');
                                        handle.end();
                                        cli.response.writeHead(200);
                                        cli.response.end(cdned);

                                        callback && callback(cdned);
                                    });
                                }, true);
                            }, false, 'utf8');
                        }, 
                        extra
                    );
                });

            }
        });
    };

    this.renderThemeLML = function(cli, ctxName, preferredFileName, extra, callback, skipLayout) {
        var theme = require('./themes.js');
        var _c = cli._c || cli;

        extra = extra || new Object();
        extra.config = _c;
        extra.contextname = ctxName;
        extra.siteid = _c.id;

        theme.fetchCurrentTheme(_c, function(cTheme) {
            extra.theme = cTheme;
            extra.minify = true;

            var readPath = _c.server.base + "flowers/" + cTheme.uName + "/" + (cTheme.contexts[ctxName] || ctxName + ".lml");
            var savePath = preferredFileName[0] == "/" ? preferredFileName : (_c.server.html + "/" + preferredFileName);
            var tmpPath = _c.server.html + "/static/tmp/" + (Math.random()).toString().substring(2) + ".themetmp";
            var layoutPath = _c.server.base + "flowers/" + cTheme.uName + "/layout.lml";
            
            if (skipLayout) {
                tmpPath = savePath;
            }

            log('FileLogic', 'Compiling context theme page', 'info');
            fileserver.readFile(readPath, function(lml) {
                extra.rootDir = readPath.substring(0, readPath.lastIndexOf('/'));
                LML2.compileToString(
                    extra.siteid, 
                    lml, 
                    extra,
                    function (ctn) {
                        log('FileLogic', 'Including compiled theme page to layout', 'detail');
                        extra.contentHTML = ctn;

                        if (skipLayout) {
                            return require('./cdn.js').parse(fileserver.minifyString(ctn), _c, function(cdned) {
                                callback(cdned);
                            });
                        }

                        extra.rootDir = layoutPath.substring(0, layoutPath.lastIndexOf('/'));
                        fileserver.readFile(layoutPath, function(layoutLML) {
                            LML2.compileToString(
                                extra.siteid,
                                layoutLML,
                                extra,
                                function (fHtml) {
                                    log('FileLogic', 'Completed Theme page compilation', 'success');
                                    require('./cdn.js').parse(fileserver.minifyString(fHtml), _c, function(cdned) { 
                                        log("FileLogic", "Minifier and CDN called back to Filelogic", 'detail');

                                        fileserver.createDirIfNotExists(savePath, function() {
                                            var handle = FileServer.getOutputFileHandle(savePath, 'w+');
                                            FileServer.writeToFile(handle, cdned, function() {
                                                callback(cdned);
                                            });
                                        }, false);
                                    });

                                    FileServer.deleteFile(tmpPath, function() {});
                                }
                            );
                        }, false, 'utf8');
                    }
                );
            }, false, 'utf8');
        });
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

    var saveLmlPage = function (cli, readPath, savePath, extra) {
        extra = extra || new Object();
        extra.siteid = cli._c.id;
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
};

module.exports = new FileLogic();
