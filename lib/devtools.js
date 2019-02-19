var Admin = require('../backend/admin.js');
const filelogic = require('../pipeline/filelogic');
var lml = require('../lml/lml.js');
var LML2 = require('../lml/compiler.js');
var notif = require('../notifications.js');
var configs = require('./config');
var fs = require('fs');
var db = require('./db.js');

var unlinkUpload = function(cli) {
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

var maybeDispatchNotification = function(cli) {
    const notifLib = require('../notifications');
    const { entity, title, msg, type } = cli.postdata.data;
    notifLib.notifyUser(entity, cli._c, {
        title, msg, type
    });

    cli.sendJSON({ok : 1})
};

var handleCacheClear = function(cli) {
    const type = cli.routeinfo.path[3];
    if (type == "homepage") {
        require('./hooks').fire('homepage_needs_refresh_' + cli._c.uid, {
            _c : cli._c, callback : function() {
                cli.sendJSON({done : true});
            }
        });
    }
};

var interpretLMLToCli = function(cli) {
    LML2.compileToString(cli._c.id, cli.postdata.data.lml, {config : cli._c, fromClient : true}, function(html) {
        cli.sendJSON({
            html: html
        });
    });
};

var restartPM2 = function(cli) {
    if (cli.hasRightOrRefuse('lilium')) {
        require('child_process').exec('pm2 restart lilium');
    }
};

var maybeInitBuild = function(cli) {
    if (cli.hasRightOrRefuse('admin')) {
        require('../make/build').initialBuild(() => { cli.sendJSON({ done : 1 }); });
    }
}

var dispatchMagicLink = function(cli) {
    require('../entities.js').sendMagicLinkToEveryone(cli, function() {
        cli.sendJSON({success : true});
    });
};

var maybeCreateComment = function(cli) {
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

var maybeRegenCache = function(cli) {
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

var maybeSendMail = function(cli) {
    var mailer = require('../mail.js');
    var data = cli.postdata.data;

    log('Devtools', 'Testing email with data ' + JSON.stringify(data));
    if (data.to && data.subject && data.content) {
        var email = mailer.createEmail(cli._c, data.to, data.subject, data.content);
        email.setHTML(data.content);

        mailer.send(email, function(err) {
            cli.sendJSON({success : !err, error : err});
        });
    } else {
        cli.sendJSON({success : false, error : "Missing fields"});
    }
};

var clearCache = function(cli, ctx) {
    var child_process = require('child_process');

    switch (ctx) {
        case 'html':
            var sites = configs.getAllSites();
            for (var i = 0; i < sites.length; i++) {
                child_process.exec('rm -rf ' + sites[i].server.html + '/*.html', function(err) {
                    notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        title: "HTML Cache",
                        msg : err || "HTML files were successfully invalidated and destroyed.",
                        type: err ? "error" : "success"
                    });
                });
            }
            cli.response.end('1');
            break;
        case 'admin':
            var sites = configs.getAllSites();
            var i = 0;

            cli.response.end('ok');
            var nextSite = function() {
                if (i == sites.length) {
                    return notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                        title: "Admin Cache",
                        msg : "Admin cache files were successfully invalidated and destroyed for all " + i + " sites.",
                        type: "success"
                    });
                }

                var site = sites[i];
                child_process.exec('rm -rf ' + site.server.html + '/admin/*', function(err) {
                    child_process.exec('rm -rf ' + site.server.html + '/login/*', function(err) {
                        i++;
                        nextSite();
                    });
                });
            };
            nextSite();

            break;
        default:
            cli.response.end("");
    }
};

var updateWordpress = function(cli) {
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

var handleWordpressUploads = function(_c, uploads, done) {
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

var handleWordpressContent = function(_c, articles, done) {
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

var clearLML3Cache = function(cli) {
    Object.keys(require.cache).filter(x => x.endsWith('lml3') || x.endsWith('petal3')).forEach(file => {
        delete require.cache[file];
    });
    
    cli.sendJSON({ok : 1})
};

var transferWPFromOrigin = function(cli) {
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

var unwrapImages = function(cli) {
    log('Devtools', 'Unwrapping all images from <p> tags');
    var db = require('./db.js');
    db.find(cli._c, 'content', {}, [], function(err, cur) {
        var done = function() {
            log('Devtools', 'Done unwrapping articles');
        };

        var next = function() {
            cur.hasNext(function(err, hasnext) {
                if (hasnext) {
                    cur.next(function(err, article) {
                        var dom = new require('jsdom').JSDOM(article.content);
                        var window = dom.window;

                        ps = window.document.querySelectorAll('p');
                        var changed = 0;

                        for (var i = 0; i < ps.length; i++) {
                            var p = ps[i];
                            if (p.querySelector('img')) {
                                var img = p.querySelector('img');
                                img.classList.add("lml-content-image");
                                p.outerHTML = '<div class="lml-image-wrapper lml-content-image-wrapper">' + 
                                    img.outerHTML + 
                                    "</div>";

                                changed++;
                            }
                        };

                        log('Devtools', 'Unwrapped ' + changed + ' images for article ' + article.title);
                        db.update(cli._c, 'content', 
                            {_id : article._id}, 
                            {content : window.document.documentElement.innerHTML}, 
                        function() {
                            next();
                        });
                    });
                } else {
                    done();
                }
            });
        };
    
        next();
    });
};

var refreshCache = function(cli, ctx) {
    switch (ctx) {
        case 'tags':
            require('./content.js').refreshTagSlugs(cli._c, function() {
                notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                    title: "Tagging",
                    msg : "Article tag slugs were successfully reassigned",
                    type: "success"
                });
            });
            break;

        case 'hp':
            require('./hooks').fire('homepage_needs_refresh_' + cli._c.uid, {
                cli : cli
            });

            notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                title: "Caching",
                msg : "Homepage was flagged as needing to be refreshed.",
                type: "success"
            });
            break;
        case 'entityslug':
            require('../entities.js').refreshSlugs(cli, function(updated) {
                notif.notifyUser(cli.userinfo.userid, cli._c.id, {
                    title: "Entities",
                    msg : "Refreshed " +updated + " entities slug.",
                    type: "success"
                });
            });
            break;
        case 'instagram':
            require('./embed.js').scanInstagram(cli);
            break;
        case 'insertads':
            parseContentAds(cli);
            break;
        case 'unwrapimgs':
            unwrapImages(cli);
            break;
    }
    cli.response.end('');
};

var runScript = function(cli, name) {
    log('Devtools', "Executing script : " + name);

    delete require.cache[require.resolve('./scripts/' + name)];
    require('./scripts/' + name)(cli);
}

var maybeRestart = function(cli) {
    if (cli.hasRight('develop')) {
        restartLilium(cli);
    } else {
        cli.sendJSON({ok : false, message : "nope"});
    }
};

var restartLilium = function(cli) {
    cli.sendJSON({ok : true, message : "restart"});
    process.send("updateAndRestart", () => {})
}

var maybeExecuteScript = function(cli) {
    if (cli.hasRightOrRefuse("develop")) {
        runScript(cli, cli.routeinfo.path[3] + ".js");
        cli.sendJSON({executed : true});
    }
};

var listAllCachedFiles = function(cli, levels, params, cb) {
    var dirPath = cli._c.server.html;
    require('./filelogic.js').listDirContent(dirPath, function(rootarr) {
        require('./filelogic.js').listDirContent(dirPath + "/next", function(nextarr) {
            require('./filelogic.js').listDirContent(dirPath + "/tags", function(tagsarr) {
                require('./filelogic.js').listDirContent(dirPath + "/category", function(catarr) {
                    require('./filelogic.js').listDirContent(dirPath + "/author", function(autharr) {
                        require('./filelogic.js').listDirContent(dirPath + "/search", function(serarr) {
                            rootarr = rootarr.filter(function(obj) { return obj.indexOf(".html") !== -1 });
                            cb({
                                html : rootarr,
                                next : nextarr,
                                tags : tagsarr,
                                category : catarr,
                                author : autharr,
                                search : serarr
                            });
                        });
                    });
                });
            });
        });
    });
};

var parseContentAds = function(cli) {
    var pcount = cli._c.content.adsperp;
    var db = require('./db.js');
    var jsdom = require("jsdom");
    log('Devtools', 'Parsing ads for all articles', 'info');
    if (pcount) {
        db.findToArray(cli._c, 'content', {}, function(err, arr) {
            var index = -1;
            var next = function() {
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
