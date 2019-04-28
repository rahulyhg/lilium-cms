const filelogic = require('../pipeline/filelogic');
const db = require('./db.js');
const mongo = require('mongodb');
const fs = require('../pipeline/filelogic');

const imageResizer = require('./imageResizer.js');
const nURL = require('url');
const nHTTP = require('http');
const mkdirp = require('mkdirp');
const dateformat = require('dateformat');

class Media {
    getDirectoryForNew(_c, send) {
        let dir = _c.server.base + "backend/static/u/" + dateformat(new Date(), 'yyyy/mm/dd') + "/";
        mkdirp(dir, () => {
            send(dir);
        });
    };

    getRelativeUrlForNew(prepend) {
        return (prepend || "") + "u/" + dateformat(new Date(), 'yyyy/mm/dd') + "/";
    }

    list(cli) {
        //Find the 25 first for now
        //TODO find a way to load more
        db.find(cli._c, 'uploads', {}, {
            limit: [25]
        }, (err, cursor) => {
            const medias = new Array();
            const extra = new Object();
            extra.medias = medias;

            cursor.each((err, media) => {
                if (media != null) {
                    medias.push(media);
                } else {
                    filelogic.serveAdminLML(cli, false, extra);
                }
            });
        });
    };

    updatecredit(cli) {
        db.update(cli._c, 'uploads', {_id : db.mongoID(cli.postdata.data.id)}, {
            artistname : cli.postdata.data.name,
            artisturl : cli.postdata.data.url
        }, (res) => {
            cli.sendJSON({
                "success" : true
            });
        });
    };

    // cli is clientObject
    // filepathOrURL is absolute path of file, or URL to download file
    transferFromWordpress(cli, filepathOrURL) {
        filepathOrURL = filepathOrURL || cli.routeinfo.params.filepath;
        const isURL = nURL.parse(filepathOrURL).protocol !== null;

        const splitDot = filepathOrURL.split('.');
        const ext = splitDot[splitDot.length - 1];
        const fileNameLength = 48;

        const fileName = "wptransferred_" + 
            Math.round(
                (
                    Math.pow(36, fileNameLength + 1) - 
                    Math.random() * 
                    Math.pow(36, fileNameLength)
                )
            ).toString(36).slice(1) + 
            "." + ext;

        const filePath = cli._c.server.html + "/uploads/" + fileName;

        const fileCallback = () => {
            imageResizer.resize(filePath, fileName, ext, cli, () => {
                // TODO : react to finish event
                cli.sendJSON({
                    success : true,
                    redirect: '',
                    filepath : filePath
                });
            });
        };

        const ws = require('fs').createWriteStream(filePath);
        if (isURL) {
            nHTTP.get(filepathOrURL, (resp) => {
                resp.pipe(ws);
            });

            ws.on('close', fileCallback);
        } else {
            fs.copyFile(filepathOrURL, filePath, fileCallback);
        }
    };

    handleUploadedFile(_c, uploader, filename, cb, force, extra) {
        this.getDirectoryForNew(_c, updir => {
            const extensions = filename.split('.');
            const mime = extensions[extensions.length - 1];
            const saveTo = updir + filename;

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

    upload(cli) {
        cli.touch('media.new');

        if (cli.method == 'POST') {
            if (cli.postdata.data.form_name == "lmlimagepicker") {
                const imagefile = cli.postdata.data.File;
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

    delete(cli) {
        if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {
            const id = new mongo.ObjectID(cli.routeinfo.path[3]);

            db.find(cli._c, 'uploads', {
                '_id': id
            }, {
                limit: [1]
            }, (err, cursor) => {
                cursor.next((err, media) => {
                    if (media) {
                        for (size in media.sizes) {
                            fs.deleteFile(media.sizes[size].path, (err) => {
                                log("file : " + media.sizes[size].path + " removed.");
                            });
                        }

                        //Delete original
                        fs.deleteFile(media.path, (err) => {
                            log("file : " + media.path + " removed.");
                        });

                        cli.did('media', 'delete', { file : media.path });

                        db.remove(cli._c, 'uploads', {
                            _id: id
                        }, (err, r) => {
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

    view(cli) {
        if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {

            const id = new mongo.ObjectID(cli.routeinfo.path[3]);
            db.exists(cli._c, 'uploads', {
                _id: id
            }, (exists) => {
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

    getMedia(cli) {
        const id = new mongo.ObjectID(cli.routeinfo.path[3]);
        db.findUnique(cli._c, 'uploads', { '_id': id }, (err, media) => {
            cli.sendJSON({
                media : media || {}
            });
        });

    }

    registerLMLLib() { };
};

module.exports = new Media();
