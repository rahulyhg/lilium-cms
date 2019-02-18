var _c = require('./config.js');

var LML = require('./lml.js');
var LML2 = require('./lml/compiler.js');
var db = require('./lib/db.js');
const filelogic = require('./pipeline/filelogic');
var checksum = require('checksum');
var compressor = require('node-minify');

var _c = require('./config.js');
var hooks = require('./hooks.js');

var precompQueue = new Array();
var siteQueue = new Object();

var JavaScriptFiles = new Object();
var CSSFiles = new Object();

var bodyPrefix = "liliumbody-";
var defaultBodySuffix = "generic";

var Precomp = function () {
    var that = this;

    this.queueFile = function(conf, lmlfile) {
        precompQueue.push(lmlfile);

        if (!siteQueue[conf.id]) {
            siteQueue[conf.id] = new Array();
        }

        var src = conf.server.html + "/compiled/" + lmlfile.slice(lmlfile.lastIndexOf('/') + 1, -4);
        siteQueue[conf.id].push({
            src : conf.server.url + "/compiled/" + lmlfile.slice(lmlfile.lastIndexOf('/') + 1, -4),
            type : src.substring(src.lastIndexOf('.') + 1)
        });
    };

    this.getSiteQueue = function(conf) {
        return siteQueue[conf.id];
    };

    var compileQueue = function(conf, cb, extra) {
        hooks.fireSite(conf, 'queue_will_compile', {config : conf});
        that.compileMultipleFiles(conf, precompQueue, function() {
            hooks.fireSite(conf, 'queue_compiled', {config : conf});
            cb();
        }, extra);
    };

    var minifyFile = function (conf, inFile, outFile, filetype, callback) {
        // Only minify in prod
        if (false && conf.env == 'prod') {
            log('Precompiler', 'Minifying ' + filetype + ' file', 'info');

            if (filetype == 'css') {
                new compressor.minify({
                    type: 'yui-css',
                    fileIn: inFile,
                    fileOut: outFile,
                    callback: function (err, min) {
                        if (err) {
                            console.error(err);
                        } else {
                            callback(err, min)
                        };
                    }
                });
            } else if (filetype == 'js') {
                new compressor.minify({
                    type: 'yui-js',
                    fileIn: inFile,
                    fileOut: outFile,
                    callback: function (err, min) {
                        if (err) {
                            console.error(err);
                        } else {
                            callback(err, min)
                        };
                    }
                });
            } else {
                filelogic.moveFile(inFile, outFile, function() {
                    callback(true);
                });
            }
        } else {
            log('Precompiler', "Moving " + inFile + " => " + outFile, 'info');
            filelogic.moveFile(inFile, outFile, function() {
                callback(true);
            });
        }
    };

    var runLoop = function (conf, readycb, themeFiles, force, extra) {
        if (themeFiles) {
            var absWritePath = conf.server.html + "/compiled/theme/";
            db.findToArray(conf, 'compiledfiles', {style : true}, function (err, histo) {
                db.remove(conf, 'compiledfiles', {style : true}, function (remErr, res) {
                    compileFiles(conf, themeFiles, histo, undefined, absWritePath, readycb, true, force, extra);
                });
            });
        } else {
            readycb();
        }
    };

    this.compileMultipleFiles = function(conf, lmlfiles, callback, extra) {
        var that = this;
        var index = -1;
        var nextFile = function() {
            index++;

            if (index < lmlfiles.length) {
                that.compileSingleFile(conf, lmlfiles[index], nextFile, extra);
            } else {
                callback();
            }
        };

        nextFile();
    };

    this.compileSingleFile = function(conf, lmlfile, callback, extra) {
        var writepath = conf.server.html + "/compiled/" + lmlfile.slice(lmlfile.lastIndexOf('/') + 1, -4);
        checksum.file(lmlfile, function(err, sum) {
            if (err) {
                callback(new Error(err));
                return;
            }

            require('./themes.js').fetchCurrentTheme(conf, function(siteTheme) {
                db.findToArray(conf, 'compiledfiles', {filename : lmlfile}, function(err, arr) {
                    log('Precomp', "Registered sum for " + lmlfile + " is " + (arr[0] ? arr[0].sum : "unknown") + " compared to actual " + sum, 'info');
                    if (arr.length == 0 || arr[0].sum !== sum) {
                        log('Precomp', 'Inserting sum ' + sum + ' for file ' + lmlfile + ' of website ' + conf.id, 'info')
                        db.remove(conf, 'compiledfiles', {filename : lmlfile}, function() {
                            db.insert(conf, 'compiledfiles', {filename : lmlfile, sum : sum, style : false}, function(err, r) {
                                LML2.compileToFile(
                                    lmlfile,
                                    writepath,
                                    callback,
                                    Object.assign({config : conf, minify : false, theme : siteTheme}, extra)
                                );
                            });
                        });
                    } else {
                        callback(false);
                    }
                });
            });
        });
    };

    var compileFiles = function (conf, fileArr, histo, absReadPath, absWritePath,  readycb, isTheme, force, extra) {
        var histoObj = new Object();
        var fileIndex = 0;
        var tempPath = conf.server.html + "/static/tmp/";

        for (var i = 0; i < histo.length; i++) {
            histoObj[histo[i].filename] = histo[i].sum;
        }

        var siteTheme;

        var nextFile = function () {
            if (fileIndex < fileArr.length) {
                var curFile = fileArr[fileIndex];
                var mustRewrite = false;
                fileIndex++;

                if (curFile.indexOf('.lml') !== -1 && curFile.indexOf('.swp') === -1) {
                    checksum.file(isTheme ? curFile : absReadPath + curFile, function (err, sum) {
                        var rPath = isTheme ? curFile : absReadPath + curFile;
                        var tPath = tempPath + 'precom-' + (Math.random()).toString().substring(2) + ".tmp." + curFile.split('/').pop();
                        var wPath = isTheme ? 
                            absWritePath + curFile.slice(curFile.lastIndexOf('/') + 1, curFile.length).slice(0, -4) : 
                            absWritePath + curFile.slice(0, -4);

                        filelogic.fileExists(wPath, function (exists) {
                            if (!force && exists && histoObj[curFile] == sum) {
                                db.insert(conf, 'compiledfiles', {
                                    filename: curFile,
                                    sum: sum,
                                    style: isTheme ? true : undefined
                                }, function (err) {
                                    nextFile();
                                });
                            } else {
                                log('Precompiler', 'Precompiling static file : ' + curFile, 'info');
                                LML2.compileToFile(
                                    rPath,
                                    tPath,
                                    function () {
                                        var beforeMinify = new Date();
                                        minifyFile(conf, tPath, wPath, wPath.substring(wPath.lastIndexOf('.') + 1), function (err, min) {
                                            if (!err) {
                                                log("Precompiler", "Minified file to " + wPath + " in " + (new Date() - beforeMinify) + "ms", 'success');
                                            }
    
                                            db.insert(conf, 'compiledfiles', {
                                                filename: curFile,
                                                sum: sum,
                                                style: isTheme ? true : undefined
                                            }, function (err) {
                                                nextFile();
                                            });
                                        });
                                    }, Object.assign({
                                        minify: isTheme,
                                        config: conf,
                                        theme : siteTheme
                                    }, extra)
                                );
                            }
                        });
                    });
                } else {
                    nextFile();
                }
            } else {
                readycb();
            }
        };

        require('./themes.js').fetchCurrentTheme(conf, function(th) {
            siteTheme = th;
            nextFile();
        });
    }

    var mergeJS = function (conf, readycb, theme) {
        var files = that.getJSQueue(theme ? 'theme' : 'admin', conf.id);
        var compiledPath = conf.server.html + "/compiled/" + (theme ? 'scripts' : 'admin') +".js";
        var fHandle = filelogic.getOutputFileHandle(compiledPath, 'w+');
        var fileIndex = 0;
        var fileTotal = files.length;

        log('Precompiler', 'Merging ' + fileTotal + ' Javascript files of '+ (theme? 'theme' : 'admin') +' context', 'info');
        var nextFile = function () {
            if (fileIndex != fileTotal) {
                filelogic.fileExists(files[fileIndex], function(exists) {
                    if (exists) {
                        filelogic.pipeFileToHandle(fHandle, files[fileIndex], function () {
                            filelogic.writeToFile(fHandle, '\n', function() {
                                log('Precompiler', 'Appended ' + files[fileIndex], 'detail');
                                fileIndex++;
                                nextFile();
                            });
                        });
                    } else {
                        log('Precompiler', 'Skipped  ' + files[fileIndex], 'warn');
                        fileIndex++;
                        nextFile();
                    }
                });
            } else {
                filelogic.closeFileHandle(fHandle);
                log('Precompiled', 'Merged ' + fileIndex + ' JS files', 'success');
                readycb();
            }
        };
        nextFile();
    };

    var mergeCSS = function (conf, readycb, theme) {
        var files = that.getCSSQueue((theme ? 'theme' :'admin'), conf.id);
        var compiledPath = conf.server.html + "/compiled/"+ (theme? 'style' : 'admin') +".css";
        var fHandle = filelogic.getOutputFileHandle(compiledPath, 'w+');
        var fileIndex = 0;
        var fileTotal = files.length;

        log('Precompiler', 'Merging ' + fileTotal + ' CSS files of '+ (theme? 'Theme' : 'Admin') +' context', 'info');
        var nextFile = function () {
            if (fileIndex != fileTotal) {
                filelogic.fileExists(files[fileIndex], function(exists) {
                    if (exists) {
                        filelogic.pipeFileToHandle(fHandle, files[fileIndex], function () {
                            log('Precompiler', 'Appended ' + files[fileIndex], 'detail');
                            fileIndex++;
                            nextFile();
                        });
                    } else {
                        log('Precompiler', 'Skipped  ' + files[fileIndex], 'warn');
                        fileIndex++;
                        nextFile();
                    }
                });
            } else {
                filelogic.closeFileHandle(fHandle);
                log('Precompiled', 'Merged ' + fileIndex + ' CSS files', 'success');
                readycb();
            }
        };
        nextFile();
    };

    this.registerJSFile = function (absPath, priority, context, siteid) {
        context = context || "all";

        // TODO Handle Site ID
        var site = JavaScriptFiles[siteid];

        if (!site) {
            site = new Object();
            JavaScriptFiles[siteid] = site;
        }

        var arr = site[context];

        if (!arr) {
            arr = new Array();
            site[context] = arr;
        }

        if (arr.indexOf(absPath) === -1 && (context != "all" || site["all"].indexOf(absPath) !== -1)) {
            while (typeof arr[priority] !== 'undefined') {
                priority++;
            }

            arr[priority] = absPath;
        };

        log('Frontend', 'Registered JS file ' + absPath + '@' + priority + " with context " + context + ' on site ' + siteid, 'detail');
    };

    this.getJSQueue = function (contextName, siteid) {
        if (JavaScriptFiles[siteid]) {
            var arr = JavaScriptFiles[siteid][contextName || "all"];
            var returnedArr = new Array();

            if (arr)
                for (var index in arr) {
                    returnedArr.push(arr[index]);
                }

            return returnedArr;
        } else {
            return [];
        }
    };

    this.registerCSSFile = function (absPath, priority, context, siteid) {
        context = context || "all";

        var site = CSSFiles[siteid];

        if (!site) {
            site = new Object();
            CSSFiles[siteid] = site;
        }

        var arr = site[context];

        if (!arr) {
            arr = new Array();
            site[context] = arr;
        }

        if (arr.indexOf(absPath) === -1 && (context != "all" || site["all"].indexOf(absPath) !== -1)) {
            while (typeof arr[priority] !== 'undefined') {
                priority++;
            }

            arr[priority] = absPath;
        };

        log('Frontend', 'Registered CSS file ' + absPath + '@' + priority + " with context " + context + ' on site ' + siteid, 'detail');
    };

    this.getCSSQueue = function (contextName, siteid) {
        if (CSSFiles[siteid]) {
            var arr = CSSFiles[siteid][contextName || "all"];
            var returnedArr = new Array();

            if (arr)
                for (var index in arr) {
                    returnedArr.push(arr[index]);
                }
    
            return returnedArr;
        } else {
            return [];
        }
    };


    this.precompile = function (conf, readycb, themesFiles, force, extra = {}) {
        filelogic.createDirIfNotExists(conf.server.html + "/compiled/", function () {
            runLoop(conf, function () {
                compileQueue(conf, function() {
                    mergeJS(conf, function () {
                        mergeCSS(conf, readycb, themesFiles ? true : false);
                    }, themesFiles ? true : false);
                }, extra);
            }, themesFiles, force, extra);
        }, true);
    };
};

const that = new Precomp();
module.exports = that;
