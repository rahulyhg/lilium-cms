const fs = require('fs');
const _c = require('../config.js');
const LML = require('../lml.js');
const LML2 = require('../lml/compiler.js');
const LML3 = require('../lml3/compiler.js');

const db = require('../includes/db.js');
const sharedcache = require('../sharedcache.js');

const mkdirp = require('mkdirp');
const path = require('path');

const minify = require('html-minifier').minify;
const uglifycss = require('uglifycss');
const UglifyJS = require("uglify-js");
const Canvas = require('canvas');
const crypto = require('crypto');
const dateFormat = require('dateformat');
const dir = require('node-dir');
const readdirp = require('readdirp');
const defaultCT = 'text/html; charset=utf-8';
const glob = require('glob');
const Minimize = new (require('minimize'))({ loose: true }); 

const serveCachedFile = function (cli, fullpath) {
    cli.touch('that.serveCachedFile');
    that.serveAbsFile(cli, fullpath);
};

const serveSpecialPage = function (cli, fullpath) {
    cli.touch('that.serveSpecialPage');
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
    cli.touch('that.redirectUserTo');
    cli.debug();
};

const checkForSpecialPage = function (cli) {
    cli.touch('that.checkForSpecialPage');
    return cli.routeinfo.admin || cli.routeinfo.login;
};

const checkForRedirection = function (cli) {
    cli.touch('that.checkForRedirection');
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
            cli.touch('that.serveSpecialPage.callback');
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
        that.fileExists(savePath, function (isPresent) {
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
        require('../lib/iplocator').findClient(cli);
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
                that.readFile(adminPath, function(content) {
                    LML2.compileToString(cli._c.id, content, extra, function(ctn) {
                        ctn = that.minifyString(ctn);
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

        that.fileExists(savePath, isPresent => {
            if (!isPresent) {
                LML.executeToFile(
                    readPath,
                    tmpPath,
                    () => {
                        LML.executeToFile(
                            adminPath,
                            savePath,
                            () => {
                                that.pipeFileToClient(cli, savePath, () => {
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

        that.fileExists(savePath, isPresent => {
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

        that.fileExists(savePath, isPresent => {
            if (isPresent) {
                that.pipeFileToClient(cli, savePath, () => {}, true, "text/html; charset=utf8");
            } else {
                const theme = require('../themes.js');
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
                            that.readFile(tmpPath, ctn => {
                                log('FileLogic', 'Passing content through CDN', 'detail');

                                require('../lib/cdn.js').parse(ctn, cli, cdned => {
                                    log('FileLogic', 'Parsed content', 'success');
                                    var handle = that.getOutputFileHandle(savePath, 'w+');
                                    that.writeToFile(handle, cdned, () => {
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
        const themeLib = require('../themes.js');
        const _c = cli._c || cli;
        const ctxName = contextname || "home";

        if (!cli.crash) {
            cli.crash = err => { throw err; };
        }   

        themeLib.fetchCurrentTheme(_c, cTheme => {
            try {
                extra.language = extra.language || _c.website.language;
                cTheme.settings = cTheme.settings || {};

                extra.theme = cTheme;
                extra.minify = true;
                extra.url = _c.server.url;
            } catch (err) {
                return cli.crash(err);
            }

            try {
                extra.vocab = require(_c.server.base + "flowers/" + cTheme.uName + "/vocab/" + extra.language + ".json");
            } catch (err) {}

            let readPath;
            let layoutPath;
            let savePath;

            try {
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
            } catch (err) {
                return cli.crash(err);
            }

            log('FileLogic', 'Compiling theme LML3 with context ' + contextname, 'info')
            LML3.compile(_c, readPath, extra, (ctn) => {
                if (nolayout) {
                    return done(ctn);
                }

                log('FileLogic', 'Adding template to LML3 theme compilation', 'info')
                extra.contentHTML = ctn;

                const next = cdned => {
                    that.createDirIfNotExists(savePath, () => {
                        try {
                            log('FileLogic', 'Writing LML3 compiled file to disk => ' + savePath, 'info');
                            fs.writeFile(savePath, cdned, { encoding : "utf8" }, err => {
                                if (err) {
                                    return cli.crash(err);
                                }
                                log('FileLogic', 'LML3 compiled file was written to disk', 'success');
                                done(cdned);
                            });
                        } catch (err) {
                            return cli.crash(err);
                        }
                    }, false);
                }

                if (layoutPath && !cTheme.nolayout) {
                    LML3.compile(_c, layoutPath, extra, (fHtml) => {
                        require('../lib/cdn.js').parse(_c.env == "dev" ? fHtml : that.minimize(fHtml), _c, cdned => {
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
        const theme = require('../themes.js');
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
            that.readFile(readPath, lml => {
                extra.rootDir = readPath.substring(0, readPath.lastIndexOf('/'));
                LML2.compileToString(
                    extra.siteid,
                    lml,
                    extra,
                    ctn => {
                        log('FileLogic', 'Including compiled theme page to layout', 'detail');
                        extra.contentHTML = ctn;

                        if (skipLayout) {
                            return require('../lib/cdn.js').parse(that.minifyString(ctn), _c, cdned => {
                                that.createDirIfNotExists(savePath, () => {
                                    var handle = that.getOutputFileHandle(savePath, 'w+');
                                    that.writeToFile(handle, cdned, () => {
                                        handle.close();
                                        handle.destroy();

                                        callback(cdned);
                                    });
                                });
                            });
                        }

                        extra.rootDir = layoutPath.substring(0, layoutPath.lastIndexOf('/'));
                        that.readFile(layoutPath, layoutLML => {
                            LML2.compileToString(
                                extra.siteid,
                                layoutLML,
                                extra,
                                fHtml => {
                                    log('FileLogic', 'Completed Theme page compilation', 'success');
                                    require('../lib/cdn.js').parse(that.minifyString(fHtml), _c, cdned => {
                                        log("FileLogic", "Minifier and CDN called back to Filelogic", 'detail');

                                        that.createDirIfNotExists(savePath, () => {
                                            var handle = that.getOutputFileHandle(savePath, 'w+');
                                            that.writeToFile(handle, cdned, () => {
                                                handle.close();
                                                handle.destroy();

                                                callback(cdned);
                                            });
                                        }, false);
                                    });

                                    that.deleteFile(tmpPath, () => {});
                                }
                            );
                        }, false, 'utf8');
                    }
                );
            }, false, 'utf8');
        });
    };

    runLogic  (cli) {
        cli.touch('that.runlogic');
        const fullpath = cli._c.server.html + cli.routeinfo.relsitepath;

        // Check for static file
        that.fileExists(fullpath, isPresent => {
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

    workDir  () {
        return __dirname;
    };

    fileExists  (fullpath, cb, sync) {
        if (sync) {
            const stats = fs.lstatSync(fullpath);
            if (stats.isDirectory()) {
                fullpath += "/index.html";
            }
            return typeof fs.accessSync(fullpath, fs.F_OK) == 'undefined';
        } else {
            let dirpath = fullpath.substring(0, fullpath.lastIndexOf('/'));
            mkdirp(dirpath, () =>  {
                fs.lstat(fullpath,  (err, stats)  => {
                    if (err) {
                        cb(false);
                        return;
                    }

                    if (stats.isDirectory()) {
                        fullpath += "/index.html";
                    }

                    fs.access(fullpath, fs.F_OK,  (err)  => {
                        cb(!err);
                    });
                });
            });
        }

    };

    minimize(content) {
        return Minimize.parse(content);
    }

    minifyString (content, options) {
        try {
            return minify(content, Object.assign({
                removeComments: true,
                collapseWhitespace: true,
                minifyJS: true,
                minifyCSS: true
            }, options || {}));
        } catch (ex) {
            log("that", "Failed to minify string : " + ex.toString().split('\n')[0], "info");
            return content;
        }
    }

    minifyHTML  (fullpath, cb) {
        const timeStamp = new Date();

        this.readFile(fullpath,  (content)  => {
            let minifiedString = "";
            let splitdot = fullpath.split('.');
            let ext = splitdot.pop();
    
            if (ext == "lml") {
                ext = splitdot.pop();
            }

            log("Minifier", "Minifying file with ext : " + ext);
            log("Minifier", "File has " + content.length + " bytes", content.length == 0 ? "warn" : "info");
            try {
                switch (ext) {
                    case "css":
                        minifiedString = uglifycss.processString(content);
                        break;
                    case "js":
                        minifiedString = UglifyJS.minify(content).code;
                        break;
                    default: 
                        minifiedString = that.minifyString(content);
                }            
            } catch (ex) {
                log('that', 'Could not minify file ' + fullpath, 'err');
                minifiedString = content
            }

            if (!minifiedString) {
                log('Minified', 'There is most likely a syntax error in file ' + fullpath, 'warn');
                minifiedString = content;
            }

            const handle = that.getOutputFileHandle(fullpath, 'w+');
            that.writeToFile(handle, minifiedString,  ()  => {
                that.closeFileHandle(handle);
                log('that', 'Minified file ' + fullpath + ' in ' + (new Date() - timeStamp) + 'ms');

                cb();
            });
        }, false, 'utf8');
    };

    dirExists  (fullpath, cb) {
        fs.lstat(fullpath,  (err, stats)  => {
            if (err || !stats.isDirectory() && !stats.isSymbolicLink()) {
                cb(false);
            } else {
                cb(true);
            }
        });
    };

    createSymlink  (src, dest, cb) {
        fs.symlink(src, dest, cb);
    };

    createSymlinkSync  (src, dest) {
        log('that', 'Symlink ' + src + ' => ' + dest, 'detail');
        try {
            this.dirExists(dest,  (exists)  => {
                if (!exists) {
                    try {
                        const stat = fs.statSync(dest);

                        if (!stat.isDirectory()) {
                            fs.symlinkSync(src, dest);
                        }
                    } catch (ex) {
                        try {
                            fs.symlinkSync(src, dest);
                        } catch (ex) {
                            log('that', 'Error while creating sync symlink ' + src, 'err');
                        }
                    }
                }
            })

        } catch (ex) {
            log('that', 'Error while creating sync symlink ' + src, 'err');
        }
    };

    dirname  (fullpath) {
        return path.dirname(fullpath);
    };

    rmrf() {
        this.emptyDirectory(...arguments);
    }

    emptyDirectory(path, opt, cb) {
        opt = opt || {};
        opt.root = path;
        opt.fileFilter = opt.fileFilter || "*";

        log('that', 'Emptying directory ' + opt.root);
        readdirp(opt, (err, content) =>  { 
            if (err) {
               return cb(err);
            }

            const files = content.files;
            if (files.length > 500 && !opt.acceptLargeDirectory) {
                cb(new Error("Found more than 500 files. Might be insecure."));
            } else {
                let index = -1;
                const nextFile = () =>  {
                    index++;

                    if (index == files.length) {
                        cb && cb();
                    } else {
                        that.deleteFile(files[index].fullPath, nextFile);
                    }
                };
                nextFile();
            }
        });
    };

    deleteFile  (path, cb) {
        log('that', 'Unlinking file ' + path);
        fs.unlink(path, cb);
    }

    deleteOccur(filter, cb, force) {
        glob(filter, {}, (err, files) => {
            log('that', "Deleting occur of " + filter + " resulting in " + files.length + " files", 'info');
            if (files.length > 80 && !force) {
                log('that', "Refused to delete more than 80 files", "warn");
                return cb && cb();
            }

            let i = -1;
            const nextFile = () => {
                if (++i == files.length) {
                    return cb && cb();
                }

                fs.unlink(files[i], nextFile);
            };

            nextFile();
        });
    }

    createDirIfNotExists  (fullpath, callback, abs) {
        abs = typeof abs === 'undefined' ? false : abs;
        const dirname = abs ? fullpath : path.dirname(fullpath);
        mkdirp(dirname,  (err)  => {
            callback(!err);
        });
    };

    readJSON  (abspath, callback, sync) {
        if (sync) {
            return JSON.parse(this.readFileSync(abspath)) || {};
        } else {
            this.readFile(abspath,  (content)  => {
                callback(JSON.parse(content || {}));
            });
        }

    };

    saveJSON  (abspath, object, callback) {
        const handle = this.getOutputFileHandle(abspath, 'w+');
        this.writeToFile(handle, JSON.stringify(object),  ()  => {
            this.closeFileHandle(handle);
            callback();
        });
    };

    readFile  (filename, callback, sync, encoding) {
        if (sync) {
            const exists = this.fileExists(filename, undefined, true);
            if (exists) {
                return fs.readFileSync(filename, encoding || "binary");
            } else {
                return undefined;
            }
        } else {
            this.fileExists(filename,  (exists)  => {
                if (exists) {
                    fs.readFile(filename, encoding || "binary",  (err, file)  => {
                        callback(file, err);
                    });
                } else {
                    callback(undefined, new Error("File does not exist."));
                }
            });
        }
    };

    readFileSync  (filename) {
        return fs.readFileSync(filename, 'utf8');
    };

    listDirContent  (dirname, callback) {
        fs.readdir(dirname,  (err, content)  => {
            callback(content || [], err);
        });
    };

    listDirContentRecursive  (dirname, callback) {
        dir.files(dirname,  (err, files)  => {
            callback(err || files);
        });
    }

    listDirContentSync  (dirname) {
        return fs.readdirSync(dirname);
    };

    copyFile  (source, dest, callback) {
        const folders = dest.split(path.sep);
        folders.pop();
        const pathToFile = folders.join('/');

        mkdirp(pathToFile,  ()  => {
            const rs = fs.createReadStream(source);
            const ws = fs.createWriteStream(dest);

            rs.on('close', callback);
            rs.pipe(ws);
        });
    };

    moveFile (source, dest, callback) {
        this.copyFile(source, dest, () =>  {
            fs.unlink(source, callback);
        });
    };

    pipeFileToClient  (cli, filename, callback, abs, mime) {
        cli.touch('that.pipeFileToClient');
        if (cli.response.finished) {
            return callback && callback();
        }

        filename = abs ? filename : this.validateIndexPath(cli, filename);

        if (!cli.response.headersSent) {
            cli.response.writeHead(200, {
                "Content-Type": mime === "default" ? defaultCT : mime || cli.routeinfo.mimetype || defaultCT
            });
        }

        try {
            const stream = fs.createReadStream(filename)
            stream.pipe(cli.response);

            stream.on('close',  ()  => {
                cli.response.end();
                stream.destroy();
                callback && callback();
            });
        } catch (err) {
            cli.crash(err);
        }
    };

    pipeContentToClient  (cli, content) {
        cli.response.writeHead(200, {
            "Content-Type": 'text/html; charset=utf-8'
        });
        cli.response.write(content);
        cli.response.end();
    };

    validateIndexPath  (cli, filename) {
        if (!cli.routeinfo.isStatic && filename.indexOf("index.html") == -1) {
            filename += "/index.html";
        }

        return filename;
    };

    getOutputFileHandle  (filename, flag, encoding) {
        return fs.createWriteStream(filename, {
            flags: flag ? flag : 'a+',
            defaultEncoding: encoding || 'utf8',
            mode: '0644'
        });
    };

    pipeFileToHandle  (handle, filename, callback) {
        const rs = fs.createReadStream(filename);
        rs.on('close', callback);
        rs.pipe(handle, {
            end : false   
        });
    };

    appendToFile(filename, text, callback) {
        const handle = fs.createWriteStream(filename, { defaultEncoding : 'utf8', flags : "a+", mode : '0644' });
        handle.write(text, 'utf8', () => {
            handle.close();
            handle.destroy();
            callback && callback();
        });
    }

    dumpToFile (filename, content, callback, encoding) {
        const handle = fs.createWriteStream(filename, {
            flags: 'w+',
            defaultEncoding: encoding || 'utf8',
            mode: '0644'
        });

        handle.write(content, encoding || 'utf8', () =>  {
            handle.close();
            handle.destroy();
            callback && callback();
        });
    };

    writeToFile  (handle, content, callback, encoding) {
        handle.write(content, encoding || 'utf8', callback);
    };

    closeFileHandle  (handle) {
        handle.end();
    };

    serveAbsFile  (cli, fullpath) {
        cli.touch('that.serveAbsFile');
        this.pipeFileToClient(cli, fullpath,  ()  => {
            cli.touch("that.serveAbsFile.callback");
        });
    };

    genRandomNameFile  (filename, prefix) {
        filename = crypto.randomBytes(10).toString('hex') + 
            filename + dateFormat(new Date(), "isoDateTime") + 
            crypto.randomBytes(10).toString('hex');

        return (prefix || "") + crypto.createHash('sha1').update(filename).digest('hex');
    }
};

const that = new FileLogic();
module.exports = that;
