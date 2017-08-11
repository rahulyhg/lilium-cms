const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const _c = require('./config.js');
const log = require('./log.js');
const minify = require('html-minifier').minify;
const uglifycss = require('uglifycss');
const UglifyJS = require("uglify-js");
const Canvas = require('canvas');
const crypto = require('crypto');
const dateFormat = require('dateformat');
const dir = require('node-dir');
const readdirp = require('readdirp');
const defaultCT = 'text/html; charset=utf-8';

class FileServer {
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

    minifyString (content, options) {
        try {
            return minify(content, Object.assign({
                removeComments: true,
                removeScriptTypeAttributes: true,
                collapseWhitespace: true,
                minifyJS: true,
                minifyCSS: true
            }, options || {}));
        } catch (ex) {
            log("FileServer", "Failed to minify string", "warn");
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
                log('Fileserver', 'Could not minify file ' + fullpath, 'err');
                minifiedString = content
            }

            if (!minifiedString) {
                log('Minified', 'There is most likely a syntax error in file ' + fullpath, 'warn');
                minifiedString = content;
            }

            const handle = that.getOutputFileHandle(fullpath, 'w+');
            that.writeToFile(handle, minifiedString,  ()  => {
                that.closeFileHandle(handle);
                log('FileServer', 'Minified file ' + fullpath + ' in ' + (new Date() - timeStamp) + 'ms');

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
                        } catch (ex) {}
                    }
                }
            })

        } catch (ex) {

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

        log('Fileserver', 'Emptying directory ' + opt.root);
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
        fs.unlink(path, cb);
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

        const stream = fs.createReadStream(filename)
        stream.pipe(cli.response);

        stream.on('close',  ()  => {
            cli.response.end();
            stream.destroy();
            callback && callback();
        });
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
        cli.touch('fileserver.serveAbsFile');
        this.pipeFileToClient(cli, fullpath,  ()  => {
            cli.touch("fileserver.serveAbsFile.callback");
        });
    };

    genRandomNameFile  (filename, prefix) {
        filename = crypto.randomBytes(10).toString('hex') + 
            filename + dateFormat(new Date(), "isoDateTime") + 
            crypto.randomBytes(10).toString('hex');

        return (prefix || "") + crypto.createHash('sha1').update(filename).digest('hex');
    }
};

const that = new FileServer();
module.exports = that;
