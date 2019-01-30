const FileServer = fileserver = require('./fileserver.js');
const _c = require('./config.js');
const LML = require('./lml.js');
const LML2 = require('./lml/compiler.js');
const LML3 = require('./lml3/compiler.js');
const log = require('./log.js');
const db = require('./includes/db.js');
const sharedcache = require('./sharedcache.js');

const serveCachedFile = function (cli, fullpath) {
    cli.touch('filelogic.serveCachedFile');
    FileServer.serveAbsFile(cli, fullpath);
};

const serveSpecialPage = function (cli, fullpath) {
    cli.touch('filelogic.serveSpecialPage');
    var specialName =
        cli.routeinfo.login ? "login" :
        cli.routeinfo.admin ? "admin" :
        "";

    var readPath = cli._c.server.base + "backend/dynamic/" + specialName + ".lml";
    var savePath = cli._c.server.html + '/' + cli._c.paths[specialName] + '/index.html';

    saveLmlPage(cli, readPath, savePath);
};

const serveStaticFile = function (cli, fullpath) {
    cli.touch('filelogix.serveStaticFile');
    cli.debug();
};

const redirectUserTo = function (cli) {
    cli.touch('filelogic.redirectUserTo');
    cli.debug();
};

const checkForSpecialPage = function (cli) {
    cli.touch('filelogic.checkForSpecialPage');
    return cli.routeinfo.admin || cli.routeinfo.login;
};

const checkForRedirection = function (cli) {
    cli.touch('filelogic.checkForRedirection');
    cli.redirectTo = undefined;
    return false;
};

const saveLmlPage = function (cli, readPath, savePath, extra) {
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

class FileLogic {
    createHtmlMail  (path, params, callback) {
        LML.executeToHtml(
            path,
            callback,
            params
        );
    };

    serveErrorPage (cli, code) {
        this.serveRelativeLML(cli, 'http/' + code, {});
    };

    serveRelativeLML (cli, path, extra) {
        const savePath = cli._c.server.html + "/" + path + '/index.html';
        FileServer.fileExists(savePath, function (isPresent) {
            const readPath = cli._c.server.base + "backend/dynamic/" + path + ".lml";
            if (!isPresent) {
                saveLmlPage(cli, readPath, savePath, extra);
            } else {
                serveCachedFile(cli, savePath);
            }
        });
    };

    serveAdminTemplate (cli, extra, templatefile, cb) {
        const adminPath = cli._c.server.base + (templatefile || "backend/dynamic/admintemplate.lml");

        // Locate entity
        require('./iplocator').findClient(cli);
        sharedcache.get('admin_template_' + cli._c.uid, function(hContent) {
            if (hContent) {
                cli.response.writeHead(200, {"content-type" : "text/html"});
                cli.response.end(hContent);
                cb && cb();
            } else {
                extra = extra || {};
                extra.rootDir = adminPath.substring(0, adminPath.lastIndexOf('/'));
                extra.config = cli._c;

                const now = new Date();
                log('LML2', "Compiling file from " + adminPath, 'info');
                FileServer.readFile(adminPath, function(content) {
                    LML2.compileToString(cli._c.id, content, extra, function(ctn) {
                        ctn = fileserver.minifyString(ctn);
                        sharedcache.set({
                            ["admin_template_" + cli._c.uid] : ctn
                        }, function() {
                            cli.response.writeHead(200, {"content-type" : "text/html"});
                            cli.response.end(ctn);
                            cb && cb();
                        });
                    });
                }, false, "utf8");
            }
        });
    };

    compile (path, cb, extra) {
        LML.executeToHtml(readPath, cb, extra);
    };

    serveLmlPluginAdminPage  (pluginName, cli, lastIsParam, extra) {
        lastIsParam = typeof lastIsParam == 'undefined' ? false : lastIsParam;
        let name;

        if (lastIsParam) {
            name = cli.routeinfo.fullpath.replace('/' + cli.routeinfo.path.pop(), '');
        } else {
            name = cli.routeinfo.fullpath;
        }

        const readPath = cli._c.server.base + "plugins/" + pluginName + "/dynamic" + name + ".lml";
        const savePath = cli._c.server.html + name + '/index.html';
        const tmpPath = cli._c.server.html + "/static/tmp/" + (Math.random()).toString().substring(2) + ".admintmp";
        const adminPath = cli._c.server.base + "backend/dynamic/admintemplate.lml";

        FileServer.fileExists(savePath, isPresent => {
            if (!isPresent) {
                LML.executeToFile(
                    readPath,
                    tmpPath,
                    () => {
                        LML.executeToFile(
                            adminPath,
                            savePath,
                            () => {
                                FileServer.pipeFileToClient(cli, savePath, () => {
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

    serveLmlPluginPage  (pluginName, cli, lastIsParam, extra) {
        lastIsParam = typeof lastIsParam == 'undefined' ? false : lastIsParam;
        let name;

        if (lastIsParam) {
            name = cli.routeinfo.relsitepath.replace('/' + cli.routeinfo.path.pop(), '');
        } else {
            name = cli.routeinfo.relsitepath;
        }

        const readPath = cli._c.server.base + "plugins/" + pluginName + "/dynamic" + name + ".lml";
        const savePath = cli._c.server.html + name + '/index.html';

        FileServer.fileExists(savePath, isPresent => {
            if (!isPresent) {
                saveLmlPage(cli, readPath, savePath, extra);
            } else {
                serveCachedFile(cli, savePath);
            }
        });
    };

    renderNextLML (cli, preferredFileName, extra = {}, callback) {
        let savePath = cli._c.server.html + "/next/" + preferredFileName;
        let tmpPath = cli._c.server.html + "/static/tmp/" + (Math.random()).toString().substring(2) + ".nexttmp";

        FileServer.fileExists(savePath, isPresent => {
            if (isPresent) {
                FileServer.pipeFileToClient(cli, savePath, () => {}, true, "text/html; charset=utf8");
            } else {
                const theme = require('./themes.js');
                extra.config = cli._c;
                extra.contextname = "next";
                extra.siteid = cli._c.id;

                theme.fetchCurrentTheme(cli._c, cTheme => {
                    extra.theme = cTheme;
                    extra.minify = true;

                    let readPath = cli._c.server.base + "flowers/" + cTheme.uName + "/" + cTheme.contexts.next;

                    log('FileLogic', 'Compiling context theme page for article without layout', 'info');
                    LML2.compileToFile(
                        readPath,
                        tmpPath,
                        () => {
                            require('./fileserver.js').readFile(tmpPath, ctn => {
                                log('FileLogic', 'Passing content through CDN', 'detail');

                                require('./cdn.js').parse(ctn, cli, cdned => {
                                    log('FileLogic', 'Parsed content', 'success');
                                    var handle = FileServer.getOutputFileHandle(savePath, 'w+');
                                    FileServer.writeToFile(handle, cdned, () => {
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

    renderThemeLML3 (cli, contextname, outputfilename, extra = {}, done, nolayout) {
        const themeLib = require('./themes.js');
        const _c = cli._c || cli;
        const ctxName = contextname || "home";

        themeLib.fetchCurrentTheme(_c, cTheme => {
            extra.language = extra.language || _c.website.language;
            cTheme.settings = cTheme.settings || {};

            extra.theme = cTheme;
            extra.minify = true;
            extra.url = _c.server.url;

            try {
                extra.vocab = require(_c.server.base + "flowers/" + cTheme.uName + "/vocab/" + extra.language + ".json");
            } catch (err) {}

            let readPath;
            let layoutPath;
            let savePath;

            if (cTheme.contexts[ctxName]) {
                readPath = _c.server.base + "flowers/" + cTheme.uName + "/" + (cTheme.contexts[ctxName] || ctxName + ".lml3");
                layoutPath = _c.server.base + "flowers/" + cTheme.uName + "/" + (cTheme.layout || "layout.lml3");
            } else {
                readPath = _c.server.base + "flowers/" + cTheme.uName + "/lml/" + _c.env + ".lml3";
            }

            savePath = outputfilename[0] == "/" ? outputfilename : (_c.server.html + "/" + outputfilename);

            if (extra.topic && extra.topic.override) {
                extra.theme.settings = Object.assign(extra.theme.settings, extra.topic.override);
            }

            log('FileLogic', 'Compiling theme LML3 with context ' + contextname, 'info')
            LML3.compile(_c, readPath, extra, (ctn) => {
                if (nolayout) {
                    return done(ctn);
                }

                log('FileLogic', 'Adding template to LML3 theme compilation', 'info')
                extra.contentHTML = ctn;

                const next = cdned => {
                    fileserver.createDirIfNotExists(savePath, () => {
                        const handle = FileServer.getOutputFileHandle(savePath, 'w+');
                        FileServer.writeToFile(handle, cdned, () => {
                            handle.close();
                            handle.destroy();

                            done(cdned);
                        });
                    }, false);
                }

                if (layoutPath) {
                    LML3.compile(_c, layoutPath, extra, (fHtml) => {
                        require('./cdn.js').parse(_c.env == "dev" ? fHtml : fileserver.minimize(fHtml), _c, cdned => {
                            next(cdned);
                        });
                    });
                } else {
                    next(ctn);
                }
            });
        });
    };

    renderThemeLML (cli, ctxName, preferredFileName, extra = {}, callback, skipLayout) {
        const theme = require('./themes.js');
        const _c = cli._c || cli;

        extra.config = _c;
        extra.contextname = ctxName;
        extra.siteid = _c.id;

        theme.fetchCurrentTheme(_c, cTheme => {
            if (cTheme && cTheme.layout && cTheme.layout.charAt(cTheme.layout.length-1) == "3") {
              return this.renderThemeLML3(...arguments)
            }

            if (!extra.language) {
                extra.language = _c.website.language;
            }

            extra.theme = cTheme;
            extra.minify = true;
            extra.vocab = require(_c.server.base + "flowers/" + cTheme.uName + "/vocab/" + extra.language + ".json");

            const readPath = _c.server.base + "flowers/" + cTheme.uName + "/" + (cTheme.contexts[ctxName] || ctxName + ".lml");
            const savePath = preferredFileName[0] == "/" ? preferredFileName : (_c.server.html + "/" + preferredFileName);
            let tmpPath = _c.server.html + "/static/tmp/" + (Math.random()).toString().substring(2) + ".themetmp";
            let layoutPath = _c.server.base + "flowers/" + cTheme.uName + "/" + (cTheme.layout || "layout.lml");

            if (skipLayout) {
                tmpPath = savePath;
            }

            if (extra.topic && extra.topic.override) {
                extra.theme.settings = Object.assign(extra.theme.settings || {}, extra.topic.override || {});
            }

            log('FileLogic', 'Compiling context theme page', 'info');
            fileserver.readFile(readPath, lml => {
                extra.rootDir = readPath.substring(0, readPath.lastIndexOf('/'));
                LML2.compileToString(
                    extra.siteid,
                    lml,
                    extra,
                    ctn => {
                        log('FileLogic', 'Including compiled theme page to layout', 'detail');
                        extra.contentHTML = ctn;

                        if (skipLayout) {
                            return require('./cdn.js').parse(fileserver.minifyString(ctn), _c, cdned => {
                                fileserver.createDirIfNotExists(savePath, () => {
                                    var handle = FileServer.getOutputFileHandle(savePath, 'w+');
                                    FileServer.writeToFile(handle, cdned, () => {
                                        handle.close();
                                        handle.destroy();

                                        callback(cdned);
                                    });
                                });
                            });
                        }

                        extra.rootDir = layoutPath.substring(0, layoutPath.lastIndexOf('/'));
                        fileserver.readFile(layoutPath, layoutLML => {
                            LML2.compileToString(
                                extra.siteid,
                                layoutLML,
                                extra,
                                fHtml => {
                                    log('FileLogic', 'Completed Theme page compilation', 'success');
                                    require('./cdn.js').parse(fileserver.minifyString(fHtml), _c, cdned => {
                                        log("FileLogic", "Minifier and CDN called back to Filelogic", 'detail');

                                        fileserver.createDirIfNotExists(savePath, () => {
                                            var handle = FileServer.getOutputFileHandle(savePath, 'w+');
                                            FileServer.writeToFile(handle, cdned, () => {
                                                handle.close();
                                                handle.destroy();

                                                callback(cdned);
                                            });
                                        }, false);
                                    });

                                    FileServer.deleteFile(tmpPath, () => {});
                                }
                            );
                        }, false, 'utf8');
                    }
                );
            }, false, 'utf8');
        });
    };

    runLogic  (cli) {
        cli.touch('filelogic.runlogic');
        const fullpath = cli._c.server.html + cli.routeinfo.relsitepath;

        // Check for static file
        FileServer.fileExists(fullpath, isPresent => {
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

    executeLMLNoCache  (cli, readPath, extra) {
        const tmpname = cli._c.server.html + "/static/tmp/" + Math.random().toString(36).slice(-12) + ".html";
        saveLmlPage(cli, readPath, tmpname, extra);
    };
};

module.exports = new FileLogic();
