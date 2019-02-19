const filelogic = require('../pipeline/filelogic');
const conf = require('../lib/config');
const db = require('./db.js');
const mongo = require('mongodb');
const fs = require('../pipeline/filelogic');

const imageResizer = require('./imageResizer.js');
const imageSize = require('image-size');
const nURL = require('url');
const nHTTP = require('http');
const mkdirp = require('mkdirp');
const dateformat = require('dateformat');

var Media = function () {
    this.getDirectoryForNew = function(_c, send) {
        let dir = _c.server.base + "backend/static/u/" + dateformat(new Date(), 'yyyy/mm/dd') + "/";
        mkdirp(dir, () => {
            send(dir);
        });
    };

    this.getRelativeUrlForNew = function(prepend) {
        return (prepend || "") + "u/" + dateformat(new Date(), 'yyyy/mm/dd') + "/";
    }

    this.list = function (cli) {
        //Find the 25 first for now
        //TODO find a way to load more
        db.find(cli._c, 'uploads', {}, {
            limit: [25]
        }, function (err, cursor) {
            var medias = new Array();
            var extra = new Object();
            extra.medias = medias;

            cursor.each(function (err, media) {
                if (media != null) {
                    medias.push(media);
                } else {
                    filelogic.serveAdminLML(cli, false, extra);
                }
            });
        });
    };

    this.updatecredit = function(cli) {
        db.update(cli._c, 'uploads', {_id : db.mongoID(cli.postdata.data.id)}, {
            artistname : cli.postdata.data.name,
            artisturl : cli.postdata.data.url
        }, function(res) {
            cli.sendJSON({
                "success" : true
            });
        });
    };

    // cli is clientObject
    // filepathOrURL is absolute path of file, or URL to download file
    this.transferFromWordpress = function(cli, filepathOrURL) {
        filepathOrURL = filepathOrURL || cli.routeinfo.params.filepath;
        var isURL = nURL.parse(filepathOrURL).protocol !== null;

        var splitDot = filepathOrURL.split('.');
        var ext = splitDot[splitDot.length - 1];
        var fileNameLength = 48;

        var fileName = "wptransferred_" + 
            Math.round(
                (
                    Math.pow(36, fileNameLength + 1) - 
                    Math.random() * 
                    Math.pow(36, fileNameLength)
                )
            ).toString(36).slice(1) + 
            "." + ext;

        var filePath = cli._c.server.html + "/uploads/" + fileName;

        var fileCallback = function() {
            imageResizer.resize(filePath, fileName, ext, cli, function() {
                // TODO : react to finish event
                cli.sendJSON({
                    success : true,
                    redirect: '',
                    filepath : filePath
                });
            });
        };

        var ws = require('fs').createWriteStream(filePath);
        if (isURL) {
            var req = nHTTP.get(filepathOrURL, function(resp) {
                resp.pipe(ws);
            });

            ws.on('close', fileCallback);
        } else {
            fs.copyFile(filepathOrURL, filePath, fileCallback);
        }
    };

    this.handleUploadedFile = function(_c, uploader, filename, cb, force, extra) {
        this.getDirectoryForNew(_c, updir => {
            var extensions = filename.split('.');
            var mime = extensions[extensions.length - 1];
            var saveTo = updir + filename;

            if (force || _c.supported_pictures.indexOf('.' + mime) != -1) {
                imageResizer.resize(saveTo, filename, mime, _c, (images, oSize) => {
                    if (oSize.code !== 1) {
                        try {
                            // Save it in database
                            db.insert(_c, 'uploads', Object.assign({
                                filename,
                                uploader,
                                path: saveTo,
                                fullurl : this.getRelativeUrlForNew() + filename,
                                name: "Full Size",
                                v : 2,
                                size: oSize,
                                type: 'image',
                                sizes: images
                            }, extra || {}), (err, result) => {
                                cb(undefined, result)
                            });
                        } catch (ex) {
                            log("Media", "ERROR : " + ex + " : " + saveTo);
                            cb(ex);
                        }
                    } else {
                        cb(new Error(oSize.core));
                    }
                });
            } else {
                cb(true);
            }
        });
    };

    this.upload = function (cli) {
        cli.touch('media.new');

        if (cli.method == 'POST') {
            if (cli.postdata.data.form_name == "lmlimagepicker") {
                var imagefile = cli.postdata.data.File;
                this.handleUploadedFile(cli._c, db.mongoID(cli.userinfo.userid), imagefile, (err, result) => {
                    if (err) {
                        cli.sendJSON({ err });
                    } else {
                        cli.did('media', 'upload', { file : imagefile });

                        cli.sendJSON({
                            redirect: "",
                            success: true,
                            picture: result.ops[0]
                        });
                    }
                });
            } else {
                cli.sendJSON({
                    msg: 'Invalid request'
                });
            }
        } else {
            filelogic.serveAdminLML(cli);
        }
    };

    this.delete = function (cli) {
        if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);

            db.find(cli._c, 'uploads', {
                '_id': id
            }, {
                limit: [1]
            }, function (err, cursor) {
                cursor.next(function (err, media) {
                    if (media) {
                        for (size in media.sizes) {
                            fs.deleteFile(media.sizes[size].path, function (err) {
                                log("file : " + media.sizes[size].path + " removed.");
                            });
                        }

                        //Delete original
                        fs.deleteFile(media.path, function (err) {
                            log("file : " + media.path + " removed.");
                        });

                        cli.did('media', 'delete', { file : media.path });

                        db.remove(cli._c, 'uploads', {
                            _id: id
                        }, function (err, r) {
                            return cli.sendJSON({
                                redirect: '/admin/media/list',
                                success: true
                            });
                        });

                    } else {
                        cli.throwHTTP(404, 'Media Not Found');
                    }
                    cursor.close();
                });
            });


        } else {
            return cli.throwHTTP(404, 'Media Not Found');
        }
    }

    this.view = function (cli) {
        if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {

            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            db.exists(cli._c, 'uploads', {
                _id: id
            }, function (exists) {
                if (exists) {
                    filelogic.serveAdminLML(cli, true, {
                        id: id
                    });
                } else {
                    cli.throwHTTP(404, 'Media Not Found');
                }
            });

        } else {
            cli.throwHTTP(404, 'Media Not Found');
        }
    }

    this.getMedia = function (cli) {
        var id = new mongo.ObjectID(cli.routeinfo.path[3]);
        db.findUnique(cli._c, 'uploads', { '_id': id }, function (err, media) {
            cli.sendJSON({
                media : media || {}
            });
        });

    }

    this.registerLMLLib = function() { };
};

module.exports = new Media();
