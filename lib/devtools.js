const notif = require('./notifications.js');
const fs = require('fs');
const db = require('./db.js');

const unlinkUpload = (cli) =>  {
    const url = cli.postdata.data.url;
    const filename = url.split('/').pop().split('_')[0];
    const hooks = require('./hooks');

    db.findUnique(cli._c, 'uploads', { filename }, (err, entry) => {
        if (entry) {
            let fullpath = entry.path;
            let totalFiles = 1;
            fs.unlinkSync(fullpath);

            Object.keys(entry.sizes).forEach(size => {
                fs.unlinkSync(entry.sizes[size].path);
                totalFiles++;
            });

            db.remove(cli._c, 'uploads', { _id : entry._id }, () => {
                cli.sendJSON({ unlinked : true, entry, total : totalFiles });
            });

            hooks.fire('file_did_unlink', { entry, cli, files : Object.keys(entry.sizes).map(x => entry.sizes[x].path) });
        } else {
            cli.sendJSON({ unlinked : false });
        }
    });
}

const maybeDispatchNotification = (cli) =>  {
    const notifLib = require('../notifications');
    const { entity, title, msg, type } = cli.postdata.data;
    notifLib.notifyUser(entity, cli._c, {
        title, msg, type
    });

    cli.sendJSON({ok : 1})
};

const handleCacheClear = (cli) =>  {
    const type = cli.routeinfo.path[3];
    if (type == "homepage") {
        require('./hooks').fire('homepage_needs_refresh_' + cli._c.uid, {
            _c : cli._c, callback : () => {
                cli.sendJSON({done : true});
            }
        });
    }
};

const maybeInitBuild = (cli) =>  {
    if (cli.hasRightOrRefuse('admin')) {
        require('../make/build').initialBuild(() => { cli.sendJSON({ done : 1 }); });
    }
}

const maybeCreateComment = (cli) =>  {
    const text = cli.postdata.data.text;
    const _id = db.mongoID(cli.postdata.data._id);
    const isThread = cli.postdata.data.isThread || false;
    const author = cli.postdata.data.userid;

    if (isThread) {
        db.insert(cli._c, 'fbreplies', {
            author, text,
            threadid : _id,
            date : Date.now()
        }, (err, r) => {
            db.update(cli._c, 'fbcomments', { _id }, {
                $inc : { replies : 1 }
            }, () => {
                cli.sendJSON({ replyid : r.insertedId });
            }, false, true, true);
        });
    } else {
        db.insert(cli._c, 'fbcomments', {
            author, text,
            postid : _id,
            date : Date.now(), 
            thread : true,
            edited : false
        }, () => {
            db.update(cli._c, 'content', { _id }, {
                $inc : { comments : 1 }
            }, (err, r) => {
                cli.sendJSON({ threadid : r.insertedId });
            }, false, true, true);
        })
    }
};

const maybeRegenCache = (cli) =>  {
    if (cli.hasRightOrRefuse('admin')) {
        cli.sendJSON({ok : 1});

        const now = Date.now();
        const total = isNaN(cli.routeinfo.path[3]) ? 1000000 : parseInt(cli.routeinfo.path[3]);
        db.join(cli._c, 'content', [
            { $match : { status : "published" } },
            { $sort : { _id : -1 } },
            { $limit : total }
        ], arr => {
            const ids = arr.map(x => x._id);
            const contentlib = require('./content');
            
            let i = -1;
            const doOne = () => {
                const _id = ids[++i];
                if (_id) {
                    setTimeout(() => {
                        contentlib.getFull(cli._c, _id, fullarticle => {
                            contentlib.generate(cli._c, fullarticle, () => doOne());
                        });
                    }, 1);
                } else {
                    notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        title: "HTML Cache",
                        msg : ids.length + " articles were regenerated in " + (Date.now() - now) + "ms",
                        type: "success"
                    });
                }
            };

            doOne();
        });
    }
};

const maybeSendMail = (cli) =>  {
    var mailer = require('./mail.js');
    var data = cli.postdata.data;

    log('Devtools', 'Testing email with data ' + JSON.stringify(data));
    if (data.to && data.subject && data.content) {
        var email = mailer.createEmail(cli._c, data.to, data.subject, data.content);
        email.setHTML(data.content);

        mailer.send(email, (err) => {
            cli.sendJSON({success : !err, error : err});
        });
    } else {
        cli.sendJSON({success : false, error : "Missing fields"});
    }
};

const updateWordpress = (cli) =>  {
    const XML2JS = require('xml2js');
    const { transferWPImages  } = require('../includes/createstack')
    cli._c.wp = cli._c.wp || {
        url : cli.postdata.data.wpurl
    };

    const parser = new XML2JS.Parser();
    parser.parseString(cli.postdata.data.xml, (err, wpdata) => {
        const channel = wpdata.rss.channel[0];

        require('../includes/transformwp')(cli._c, channel, data => {
            handleWordpressContent(cli._c, data.content, () => {
                handleWordpressUploads(cli._c, data.uploads, () => {
                    cli.sendJSON({ articles : data.content.length });

                    transferWPImages(cli._c, {
                        dbdata : {
                            uploads : data.uploads
                        }
                    }, () => {});
                }); 
            });  
        });
    });
};

const handleWordpressUploads = (_c, uploads, done) => {
    const nextUpload = () => {
        setTimeout(() => {
            let upload = uploads[--i];
            if (upload) {
                db.findUnique(_c, 'uploads', { wpid : upload.wpid }, (err, existing) => {
                    if (existing) {
                        return nextUpload();
                    }

                    log('Wordress', 'Inserted new upload with WPID : ' + upload.wpid + ' and mongo ID ' + upload._id, 'success')
                    db.insert(_c, 'uploads', upload, () => nextUpload());
                });
            } else {
                log('Wordpress', 'Updated all uploads', 'success');
                done();
            }
        }, 0);
    };
    let i = uploads.length;
    nextUpload();
};

const handleWordpressContent = (_c, articles, done) => {
    const nextPost = () => {
        setTimeout(() => {
            let article = articles[--i];
            if (article) {
                db.findUnique(_c, 'content', {
                    title : article.title[0]
                }, (err, existing) => {
                    if (existing) {
                        return nextPost();
                    }

                    article.author = undefined;
                    db.findUnique(require('./config').default(), 'entities', {}, (err, author) => {
                        if (author) {
                            article.author = author._id;
                            article.createdBy = author._id;
                        }
    
                        log('Wordpress', 'Inserted new article with title : ' + article.title[0], 'detail');
                        db.insert(_c, 'content', article, () => nextPost());
                    }, {_id : -1})          
                })
            } else {
                log('Wordpress', 'Updated all articles', 'success');
                done();
            }
        }, 0);
    };
    let i = articles.length;
    nextPost();
};

const clearLML3Cache = (cli) =>  {
    Object.keys(require.cache).filter(x => x.endsWith('lml3') || x.endsWith('petal3')).forEach(file => {
        delete require.cache[file];
    });
    
    cli.sendJSON({ok : 1})
};

const transferWPFromOrigin = (cli) =>  {
    const path = require('path');
    const mkdirp = require('mkdirp');
    const request = require('request');
    const fs = require('fs');

    const files = [];

    let index = -1;
    const startTransfer = () => {
        const nextImage = () => {
            const file = files[++index];

            if (file) {
                request({ url : file.url, encoding : 'binary' }, (err, res) => {
                    if (res.statusCode == 200) {
                        mkdirp(file.dir, () => {
                            fs.writeFile(path.join(file.dir, file.filename), res.body, {encoding : 'binary'}, () => {
                                nextImage();
                            });
                        });
                    } else {
                        nextImage();
                    }
                });
            } else {
                log('Devtools', '--------------------------------', 'success');
                log('Devtools', 'Done handling WP images transfer', 'success');                
                log('Devtools', '--------------------------------', 'success');
            }
        };

        nextImage();
    };

    db.find(cli._c, "uploads", { wptransferred : true, wpfiletransferred : false }, [], (err, cur) => {
        log('Devtools', 'Listing images to download', 'info');
        const nextImage = () => {
            cur.next((err, image) => {
                if (image) {
                    files.push[{
                        url : cli._c.server.protocol + cli._c.server.url + image.wppath,
                        dir : image.dirpath,
                        filename : image.filename
                    }];
                    Object.keys(image.sizes).forEach(size => {
                        image.sizes[size].wpurl && files.push({
                            url : cli._c.server.protocol + cli._c.server.url + image.sizes[size].wpurl,
                            dir : image.dirpath,
                            filename : image.sizes[size].wpfile
                        });
                    })

                    nextImage();
                } else {
                    log('Devtools', 'Done listing images for WP transfer. Total : ' + files.length, 'info');
                    startTransfer();
                }
            });
        }

        nextImage();
    });
};

const runScript = (cli, name) =>  {
    log('Devtools', "Executing script : " + name);

    delete require.cache[require.resolve('./scripts/' + name)];
    require('./scripts/' + name)(cli);
}

const maybeRestart = (cli) =>  {
    if (cli.hasRight('develop')) {
        restartLilium(cli);
    } else {
        cli.sendJSON({ok : false, message : "nope"});
    }
};

const restartLilium = (cli) =>  {
    cli.sendJSON({ok : true, message : "restart"});
    process.send("updateAndRestart", () => {})
}

const maybeExecuteScript = (cli) =>  {
    if (cli.hasRightOrRefuse("develop")) {
        runScript(cli, cli.routeinfo.path[3] + ".js");
        cli.sendJSON({executed : true});
    }
};

const parseContentAds = (cli) =>  {
    var pcount = cli._c.content.adsperp;
    var db = require('./db.js');
    var jsdom = require("jsdom");
    log('Devtools', 'Parsing ads for all articles', 'info');
    if (pcount) {
        db.findToArray(cli._c, 'content', {}, (err, arr) => {
            var index = -1;
            const next = () =>  {
                index++;
                if (index == arr.length) {
                    log('Devtools', '[100.0%] Finished ads insertion', 'success');
                    notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        title : "Content ads",
                        msg : "Parsed all " + index + " articles, inserting ads every " + pcount + " paragraphs.",
                        type : "success"
                    });
                } else {
                    require('./content.js').insertAds(cli._c, arr[index], next);
                }
            };

            next();
        });
    } else {
        notif.notifyUser(cli.userinfo.userid, cli._c.id, {
            title : "Content ads",
            msg : "No paragraphs count for ad insertion",
            type : "warning"
        });
    }
};

module.exports = {
    updateWordpress, transferWPFromOrigin, clearLML3Cache, unlinkUpload, handleCacheClear,
    maybeRegenCache, maybeCreateComment, maybeInitBuild, maybeExecuteScript, maybeDispatchNotification,
    maybeRestart, maybeSendMail
};
