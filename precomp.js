var _c = require('./config.js');
var log = require('./log.js');
var LML = require('./lml.js');
var db = require('./includes/db.js');
var fileserver = require('./fileserver.js');
var checksum = require('checksum');
var compressor = require('node-minify');
var frontend = require('./frontend.js');
var log = require('./log.js');
var _c = require('./config.js');

var Precomp = function () {
    var minifyFile = function (inFile, outFile, filetype, callback) {
        log('Precompiler', 'Minifying ' + filetype + ' file');
        // Only minify in prod
        if (_c.default.env == 'prod') {
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
                fileserver.copyFile(inFile, outFile, callback);
            }
        } else {
            fileserver.copyFile(inFile, outFile, callback);

        }
    };

    var runLoop = function (conf, readycb, themeFiles) {
        if (themeFiles) {
            var absWritePath = conf.server.html + "/compiled/theme/";
            db.findToArray(conf, 'compiledfiles', {style : true}, function (err, histo) {
                db.remove(conf, 'compiledfiles', {style : true}, function (remErr, res) {
                    compileFiles(conf, themeFiles, histo, undefined, absWritePath, readycb, true);
                });
            });

        } else {
            var absReadPath = conf.server.base + "backend/dynamic/precomp/";
            var absWritePath = conf.server.html + "/compiled/admin/";

            log('Precompiler', 'Precompiling static files');
            fileserver.listDirContentRecursive(absReadPath, function (fileArr) {
                // Read files registered
                var files = [];
                fileArr.forEach(function (file) {
                    files.push(file.replace(absReadPath, ''));
                });
                fileArr = files;
                db.findToArray(conf, 'compiledfiles', {style : null}, function (err, histo) {
                    db.remove(conf, 'compiledfiles', {style : null}, function (remErr, res) {
                        compileFiles(conf, fileArr, histo, absReadPath, absWritePath, readycb)
                    });
                });
            });
        }

    };

    var compileFiles = function (conf, fileArr, histo, absReadPath, absWritePath,  readycb, isTheme) {
        var histoObj = new Object();
        var fileIndex = 0;
        var tempPath = conf.server.html + "/static/tmp/";

        for (var i = 0; i < histo.length; i++) {
            histoObj[histo[i].filename] = histo[i].sum;
        }

        var nextFile = function () {
            if (fileIndex < fileArr.length) {
                var curFile = fileArr[fileIndex];
                var mustRewrite = false;
                fileIndex++;

                if (curFile.indexOf('.lml') !== -1) {
                    checksum.file(isTheme ? curFile : absReadPath + curFile, function (err, sum) {
                        var rPath = isTheme ? curFile : absReadPath + curFile;
                        var tPath = tempPath + 'precom-' + (Math.random()).toString().substring(2) + ".tmp";
                        var wPath = isTheme ? absWritePath + curFile.slice(curFile.lastIndexOf('/'), curFile.length).slice(0, -4) : absWritePath + curFile.slice(0, -4);
                        fileserver.fileExists(wPath, function (exists) {
                            if (exists && histoObj[curFile] == sum) {
                                db.insert(conf, 'compiledfiles', {
                                    filename: curFile,
                                    sum: sum
                                }, function (err) {
                                    nextFile();
                                });
                            } else {
                                log('Precompiler', 'Precompiling static file : ' + curFile);
                                LML.executeToFile(
                                    rPath,
                                    tPath,
                                    function () {
                                        var beforeMinify = new Date();
                                        minifyFile(tPath, wPath, wPath.substring(wPath.lastIndexOf('.') + 1), function () {
                                            log("Precompiler", "Minified file to " + wPath + " in " + (new Date() - beforeMinify) + "ms");
                                            db.insert(conf, 'compiledfiles', {
                                                filename: curFile,
                                                sum: sum,
                                                style: isTheme ? true : undefined
                                            }, function (err) {
                                                nextFile();
                                            });
                                        });
                                    }, {
                                        minify: false,
                                        config: conf
                                    }
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

        nextFile();
    }

    var mergeJS = function (conf, readycb, theme) {
        var files = frontend.getJSQueue(theme ? 'theme' : 'admin', conf.id);
        var compiledPath = conf.server.html + "/compiled/" + (theme ? 'scripts' : 'admin') +".js";
        var fHandle = fileserver.getOutputFileHandle(compiledPath, 'w+');
        var fileIndex = 0;
        var fileTotal = files.length;

        log('Precompiler', 'Merging ' + fileTotal + ' Javascript files of '+ (theme? 'Theme' : 'Admin') +' context');
        var nextFile = function () {
            if (fileIndex != fileTotal) {
                fileserver.pipeFileToHandle(fHandle, files[fileIndex], function () {
                    log('Precompiler', 'Appended ' + files[fileIndex]);
                    fileIndex++;
                    nextFile();
                });
            } else {
                fileserver.closeFileHandle(fHandle);
                log('Precompiled', 'Merged ' + fileIndex + ' JS files');
                readycb();
            }
        };
        nextFile();
    };

    var mergeCSS = function (conf, readycb, theme) {
        var files = frontend.getCSSQueue((theme ? 'theme' :'admin'), conf.id);
        var compiledPath = conf.server.html + "/compiled/"+ (theme? 'style' : 'admin') +".css";
        var fHandle = fileserver.getOutputFileHandle(compiledPath, 'w+');
        var fileIndex = 0;
        var fileTotal = files.length;

        log('Precompiler', 'Merging ' + fileTotal + ' CSS files of '+ (theme? 'Theme' : 'Admin') +' context');
        var nextFile = function () {
            if (fileIndex != fileTotal) {
                fileserver.pipeFileToHandle(fHandle, files[fileIndex], function () {
                    log('Precompiler', 'Appended ' + files[fileIndex]);
                    fileIndex++;
                    nextFile();
                });
            } else {
                fileserver.closeFileHandle(fHandle);
                log('Precompiled', 'Merged ' + fileIndex + ' CSS files');
                readycb();
            }
        };
        nextFile();
    };

    this.precompile = function (conf, readycb, themesFiles) {
        fileserver.createDirIfNotExists(conf.server.html + "/compiled/", function () {
            runLoop(conf, function () {
                mergeJS(conf, function () {
                    mergeCSS(conf, readycb, themesFiles ? true : false);
                }, themesFiles ? true : false);
            }, themesFiles);
        }, true);
    };
};

module.exports = new Precomp();
