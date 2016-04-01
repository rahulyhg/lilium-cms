var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var _c = require('./config.js');
var log = require('./log.js');
var minify = require('html-minifier').minify;
var Canvas = require('canvas');
var crypto = require('crypto');
var dateFormat = require('dateformat');
var dir = require('node-dir');


var FileServer = function () {
    this.workDir = function () {
        return __dirname;
    };

    this.fileExists = function (fullpath, cb) {
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
    };

    this.minifyHTML = function (fullpath, cb) {
        var that = this;
        var timeStamp = new Date();

        this.readFile(fullpath, function (content) {
            var handle = that.getOutputFileHandle(fullpath, 'w+');
            that.writeToFile(handle, minify(content, {
                removeComments: true,
                removeScriptTypeAttributes: true,
                collapseWhitespace: true,
                minifyJS: true,
                minifyCSS: true
            }), function () {
                that.closeFileHandle(handle);
                log('FileServer', 'Minified file ' + fullpath + ' in ' + (new Date() - timeStamp) + 'ms');

                cb();
            });
        });
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

    this.readJSON = function (abspath, callback) {
        this.readFile(abspath, function (content) {
            callback(JSON.parse(content || {}));
        });
    };

    this.saveJSON = function (abspath, object, callback) {
        var that = this;
        var handle = this.getOutputFileHandle(abspath, 'w+');
        this.writeToFile(handle, JSON.stringify(object), function () {
            that.closeFileHandle(handle);
            callback();
        });
    };

    this.readFile = function (filename, callback) {
        this.fileExists(filename, function (exists) {
            if (exists) {
                fs.readFile(filename, "binary", function (err, file) {
                    callback(file);
                });
            } else {
                callback(undefined);
            }
        });
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

    this.pipeFileToClient = function (cli, filename, callback) {
        cli.touch('fileserver.pipeFileToClient');
        filename = this.validateIndexPath(cli, filename);
        cli.response.writeHead(200, {
            "Content-Type": cli.routeinfo.mimetype || 'text/html; charset=utf-8'
        });

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

    this.getOutputFileHandle = function (filename, flag) {
        return fs.createWriteStream(filename, {
            flags: flag ? flag : 'a+',
            defaultEncoding: 'utf8',
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

    this.writeToFile = function (handle, content, callback) {
        handle.write(content, 'utf8', callback);
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
        filename = crypto.randomBytes(10).toString('hex') + filename + dateFormat(new Date(), "isoDateTime");
        return crypto.createHash('md5').update(filename).digest('hex');
    }

    /**
     * Generate an image based on given text
     * @param  {string} text     The text to convert in an image
     * @param  {string} path     The complete path where to save the image. Must be a .png
     * @param  {function} cb     The callback once the image is generated
     */
    this.genImageFromText = function (text, path, cb) {

        // Gen Image
        var Image = Canvas.Image
        var canvas = new Canvas(100, 60)
        var ctx = canvas.getContext('2d');
        var Font = Canvas.Font;

        //create signature font
        var artySignFont = new Font('ArtySign', _c.default.server.base + "backend/static/fonts/ArtySignature.otf");
        ctx.addFont(artySignFont);

        ctx.font = '100px ArtySign';
        ctx.fillText(text, 0, 29);

        // Recreate a canvas with the appropriate width
        var size = ctx.measureText(text);

        canvas = new Canvas(size.width + 30, 150);

        newContext = canvas.getContext('2d');
        newContext.addFont(artySignFont);

        newContext.font = '100px ArtySign';
        newContext.fillText(text, 15, 100);


        // // Save it
        var out = fs.createWriteStream(path);
        var stream = canvas.pngStream();

        stream.on('data', function (chunk) {
            out.write(chunk);
        });

        stream.on('end', function () {
            cb(path);
        });
    }

    var init = function () {

    };

    init();
};

module.exports = new FileServer();
