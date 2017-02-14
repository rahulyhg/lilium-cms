var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var _c = require('./config.js');
var log = require('./log.js');
var minify = require('html-minifier').minify;
var uglifycss = require('uglifycss');
var UglifyJS = require("uglify-js");
var Canvas = require('canvas');
var crypto = require('crypto');
var dateFormat = require('dateformat');
var dir = require('node-dir');
var readdirp = require('readdirp');

var FileServer = function () {
    var defaultCT = 'text/html; charset=utf-8';
    var that = this;

    this.workDir = function () {
        return __dirname;
    };

    this.fileExists = function (fullpath, cb, sync) {
        if (sync) {
            var stats = fs.lstatSync(fullpath);
            if (stats.isDirectory()) {
                fullpath += "/index.html";
            }
            return typeof fs.accessSync(fullpath, fs.F_OK) == 'undefined';

        } else {
            fs.lstat(fullpath, function (err, stats) {
                if (err) {
                    cb(false);
                    return;
                }

                if (stats.isDirectory()) {
                    fullpath += "/index.html";
                }

                fs.access(fullpath, fs.F_OK, function (err) {
                    cb(!err);
                });
            });
        }

    };

    this.minifyHTML = function (fullpath, cb) {
        var that = this;
        var timeStamp = new Date();

        this.readFile(fullpath, function (content) {
            var minifiedString = "";
            var splitdot = fullpath.split('.');
            var ext = splitdot.pop();
    
            if (ext == "lml") {
                ext = splitdot.pop();
            }

            log("Minifier", "Minifying file with ext : " + ext);
            try {
                switch (ext) {
                    case "css":
                        minifiedString = uglifycss.processString(content);
                        break;
                    case "js":
                        minifiedString = UglifyJS.minify(content, {fromString: true}).code;
                        break;
                    default: 
                        minifiedString = minify(content, {
                            removeComments: true,
                            removeScriptTypeAttributes: true,
                            collapseWhitespace: true,
                            minifyJS: true,
                            minifyCSS: true
                        });
                }
            } catch (ex) {
                log('Fileserver', 'Could not minify file ' + fullpath, 'err');
                minifiedString = content
            }

            var handle = that.getOutputFileHandle(fullpath, 'w+');
            that.writeToFile(handle, minifiedString, function () {
                that.closeFileHandle(handle);
                log('FileServer', 'Minified file ' + fullpath + ' in ' + (new Date() - timeStamp) + 'ms');

                cb();
            });
        }, false, 'utf8');
    };

    this.dirExists = function (fullpath, cb) {
        fs.lstat(fullpath, function (err, stats) {
            if (err || !stats.isDirectory() && !stats.isSymbolicLink()) {
                cb(false);
            } else {
                cb(true);
            }
        });
    };

    this.createSymlink = function (src, dest, cb) {
        fs.symlink(src, dest, cb);
    };

    this.createSymlinkSync = function (src, dest) {
        try {
            this.dirExists(dest, function (exists) {
                if (!exists) {
                    try {
                        var stat = fs.statSync(dest);

                        if (!stat.isDirectory()) {
                            fs.symlinkSync(src, dest);
                        }
                    } catch (ex) {
                        try {
                            fs.symlinkSync(src, dest);
                        } catch (ex) {}
                    }
                }
            })

        } catch (ex) {

        }
    };

    this.dirname = function (fullpath) {
        return path.dirname(fullpath);
    };

    this.emptyDirectory = this.rmrf = function(path, opt, cb) {
        opt = opt || {};
        opt.root = path;
        opt.fileFilter = opt.fileFilter || "*";

        log('Fileserver', 'Emptying directory ' + opt.root);
        readdirp(opt, function(err, content) { 
            if (err) {
               return cb(err);
            }

            var files = content.files;
            if (files.length > 500) {
                cb(new Error("Found more than 500 files. Might be insecure."));
            } else {
                var index = -1;
                var nextFile = function() {
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

    this.deleteFile = function (path, cb) {
        fs.unlink(path, cb);
    }

    this.createDirIfNotExists = function (fullpath, callback, abs) {
        abs = typeof abs === 'undefined' ? false : abs;
        var dirname = abs ? fullpath : path.dirname(fullpath);
        mkdirp(dirname, function (err) {
            callback(!err);
        });
    };

    this.readJSON = function (abspath, callback, sync) {
        if (sync) {
            return JSON.parse(this.readFileSync(abspath)) || {};
        } else {
            this.readFile(abspath, function (content) {
                callback(JSON.parse(content || {}));
            });
        }

    };

    this.saveJSON = function (abspath, object, callback) {
        var that = this;
        var handle = this.getOutputFileHandle(abspath, 'w+');
        this.writeToFile(handle, JSON.stringify(object), function () {
            that.closeFileHandle(handle);
            callback();
        });
    };

    this.readFile = function (filename, callback, sync, encoding) {
        if (sync) {
            var exists = this.fileExists(filename, undefined, true);
            if (exists) {
                return fs.readFileSync(filename, encoding || "binary");
            } else {
                return undefined;
            }
        } else {
            this.fileExists(filename, function (exists) {
                if (exists) {
                    fs.readFile(filename, encoding || "binary", function (err, file) {
                        callback(file, err);
                    });
                } else {
                    callback(undefined, new Error("File does not exist."));
                }
            });
        }
    };

    this.readFileSync = function (filename) {
        return fs.readFileSync(filename, 'utf8');
    };

    this.listDirContent = function (dirname, callback) {
        fs.readdir(dirname, function (err, content) {
            callback(err || content);
        });
    };

    this.listDirContentRecursive = function (dirname, callback) {
        dir.files(dirname, function (err, files) {
            callback(err || files);
        });
    }

    this.listDirContentSync = function (dirname) {
        return fs.readdirSync(dirname);
    };

    this.copyFile = function (source, dest, callback) {
        var folders = dest.split(path.sep);
        folders.pop();
        var pathToFile = folders.join('/');

        mkdirp(pathToFile, function () {
            var rs = fs.createReadStream(source);
            var ws = fs.createWriteStream(dest);

            rs.on('close', callback);
            rs.pipe(ws);
        });
    };

    this.moveFile = function(source, dest, callback) {
        this.copyFile(source, dest, function() {
            fs.unlink(source, callback);
        });
    };

    this.pipeFileToClient = function (cli, filename, callback, abs, mime) {
        cli.touch('fileserver.pipeFileToClient');
        if (cli.response.finished) {
            return callback && callback();
        }

        filename = abs ? filename : this.validateIndexPath(cli, filename);

        if (!cli.response.headersSent) {
            cli.response.writeHead(200, {
                "Content-Type": mime === "default" ? defaultCT : mime || cli.routeinfo.mimetype || defaultCT
            });
        }

        var stream = fs.createReadStream(filename)
        stream.pipe(cli.response);

        stream.on('close', function () {
            cli.response.end();
            if (callback) callback();
        });
    };

    this.pipeContentToClient = function (cli, content) {
        cli.response.writeHead(200, {
            "Content-Type": 'text/html; charset=utf-8'
        });
        cli.response.write(content);
        cli.response.end();
    };

    this.validateIndexPath = function (cli, filename) {
        if (!cli.routeinfo.isStatic && filename.indexOf("index.html") == -1) {
            filename += "/index.html";
        }

        return filename;
    };

    this.getOutputFileHandle = function (filename, flag, encoding) {
        return fs.createWriteStream(filename, {
            flags: flag ? flag : 'a+',
            defaultEncoding: encoding || 'utf8',
            mode: '0644'
        });
    };

    this.pipeFileToHandle = function (handle, filename, callback) {
        var rs = fs.createReadStream(filename);
        rs.on('close', callback);
        rs.pipe(handle, {
            end: false
        });
    };

    this.writeToFile = function (handle, content, callback, encoding) {
        handle.write(content, encoding || 'utf8', callback);
    };

    this.closeFileHandle = function (handle) {
        handle.end();
    };

    this.serveRelFile = function (cli, filename) {

    };

    this.serveAbsFile = function (cli, fullpath) {
        cli.touch('fileserver.serveAbsFile');
        this.pipeFileToClient(cli, fullpath, function () {
            cli.touch("fileserver.serveAbsFile.callback");
        });
    };

    this.serveIndex = function (cli, dirpath) {

    };

    this.genRandomNameFile = function (filename) {
        filename = crypto.randomBytes(10).toString('hex') + 
            filename + dateFormat(new Date(), "isoDateTime") + 
            crypto.randomBytes(10).toString('hex');

        return crypto.createHash('sha1').update(filename).digest('hex');
    }

    /**
     * Generate an image based on given text
     * @param  {string} text     The text to convert in an image
     * @param  {string} path     The complete path where to save the image. Must be a .png
     * @param  {function} cb     The callback once the image is generated
     */
    this.genImageFromText = function (text, path, cb) {
        log("FileServer", "Initializing canvas for text to image");
        // Gen Image
        var Image = Canvas.Image
        var canvas = new Canvas(100, 60)
        var ctx = canvas.getContext('2d');
        var Font = Canvas.Font;

        //create signature font
        var artySignFont = new Font('ArtySign', _c.default().server.base + "backend/static/fonts/ArtySignature.otf");
        ctx.addFont(artySignFont);

        ctx.font = '100px ArtySign';
        ctx.fillText(text, 0, 29);

        // Recreate a canvas with the appropriate width
        var size = ctx.measureText(text);

        log("FileServer", "Creating canvas");
        canvas = new Canvas(size.width + 30, 150);

        newContext = canvas.getContext('2d');
        newContext.addFont(artySignFont);

        newContext.font = '100px ArtySign';
        newContext.fillText(text, 15, 100);


        // // Save it
        var out = fs.createWriteStream(path);
        var stream = canvas.pngStream();

        log("FileServer", "Streaming data to file");
        stream.on('data', function (chunk) {
            out.write(chunk);
        });

        stream.on('end', function () {
            log('FileServer', "Saved text to image at " + path);
            cb(path);
        });
    }

    var init = function () {

    };

    init();
};

module.exports = new FileServer();
