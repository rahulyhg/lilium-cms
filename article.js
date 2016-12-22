var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var livevars = require('./livevars.js');
var cacheInvalidator = require('./cacheInvalidator.js');
var fs = require('./fileserver.js');
var notifications = require('./notifications.js');
var slugify = require('slug');
var tableBuilder = require('./tableBuilder.js');
var hooks = require('./hooks.js');
var dates = require('./dates.js');
var badges = require('./badges.js');
var moment = require('moment');
var log = require('./log.js');
var feed = require('./feed.js');

var Article = function() {
    var publishedNotificationTitles = [
        "You got this!",
        "Allllright!",
        "Look at you!",
        "Gratz!",
        "Yes, you did!",
        "You're simply great!",
        "Say whaaat!",
        "Annnd it's live!",
        "You're the real deal!",
        "Guess what!"
    ];

    this.handlePOST = function(cli) {
        cli.touch('article.handlePOST');
        switch (cli.routeinfo.path[2]) {
            case 'new':
                if (cli.hasRightOrRefuse("create-articles")) this.create(cli);
                break;
            case 'edit':
                if (cli.hasRightOrRefuse("publish-articles")) this.publish(cli, "create");
                break;
            case 'delete':
                if (cli.hasRightOrRefuse("publish-articles")) this.delete(cli);
                break;
            case 'delete-autosave':
                if (cli.hasRightOrRefuse("create-articles")) this.deleteAutosave(cli);
                break;
            case 'autosave':
                if (cli.hasRightOrRefuse("create-articles")) this.save(cli, true);
                break;
            case 'save':
                if (cli.hasRightOrRefuse("create-articles")) this.save(cli);
                break;
            case 'preview':
                if (cli.hasRightOrRefuse("create-articles")) this.publish(cli, "preview");
                break;
            case 'destroy':
                if (cli.hasRightOrRefuse("destroy-articles")) this.delete(cli, true);
                break;
            case 'addfeature':
                if (cli.hasRightOrRefuse("create-articles")) this.addFeature(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;
        }
    };

    this.handleGET = function(cli) {
        cli.touch('article.handleGET');
        if (!cli.hasRightOrRefuse("list-articles")) { return; }

        if (cli.routeinfo.path.length == 2) {
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "/list", true);
        } else {
            switch (cli.routeinfo.path[2]) {
                case 'new':
                    cli.hasRight('create-articles') ?
                        filelogic.serveAdminLML(cli) :
                        cli.refuse();
                    break;
                case 'edit':
                    if (cli.hasRight('create-articles')) {
                        if (cli.routeinfo.path[3] && cli.routeinfo.path[3] == 'autosave') {
                            filelogic.serveAdminLML(cli, true);
                        } else {
                            this.edit(cli);
                        }
                    }
                    break;
                case 'getArticle':
                    this.getArticle(cli);
                    break;
                case 'list':
                    this.list(cli);
                    break;
                case 'infostrip':
                    this.infoStrip(cli);
                    break;
                default:
                    return cli.throwHTTP(404, 'Not Found');
            }
        }
    };

    this.query = function(cli, opts, cb) {
        db.paramQuery(cli, opts, cb);
    };

    this.list = function(cli) {
        filelogic.serveAdminLML(cli, false);
    };

    this.infoStrip = function(cli) {
        db.findToArray(cli._c, 'content', {_id : db.mongoID(cli.routeinfo.path[3])}, function(err, arr) {
            if (arr.length != 0) {
                var art = arr[0];
                db.findToArray(conf.default(), 'entities', {_id : art.author}, function(err, autarr) {
                    cli.sendJSON({
                        status : art.status,
                        url : art.name ? cli._c.server.url + "/" + art.name : "This article doesn't have a URL.",
                        updated : art.updated,
                        author : autarr[0].displayname
                    });
                });
            } else {
                cli.sendJSON({error : "Article not found"});
            }
        });
    };

    this.deepFetch = function(conf, idOrName, cb, preview, extraconds) {
        var cond = extraconds || new Object();
        cond[typeof idOrName === "string" ? "name" : "_id"] = idOrName;

        db.join(conf, preview ? 'preview' : 'content', [
            {
               $match : cond
            }, {
                $lookup:{
                    from:           "uploads",
                    localField:     "media",
                    foreignField:   "_id",
                    as:             "featuredimage"
                }
            }
        ], function(arr) {
            if (arr.length === 0) {
                cb(false, new Error("No article found"));
            } else {
                db.rawCollection(conf, 'content', {"strict":true}, function(err, col) {
                    col.aggregate([{
                        $match : {
                            $text : { 
                                $search : arr[0].title ? arr[0].title.replace(/[^a-zA-Z\s]/g, '') : arr[0].name
                            }
                        }
                    },{
                        $match : {
                            $and : [{
                                status : "published"
                            }, {
                                media : {
                                    $exists : true,
                                    $ne : ""
                                }
                            }]
                        }
                    },{
                        $sort : { 
                            score: { 
                                $meta: "textScore" 
                            } 
                        }
                    },{
                        $limit : 7
                    },{
                        $lookup : {
                            from:           "uploads",
                            localField:     "media",
                            foreignField:   "_id",
                            as:             "featuredimage"
                        }
                    }]).toArray(function(err, relarr) {
                        if (!err) {
                            arr[0].related = relarr.slice(1);
                        }

                        col.find({
                            date : { $lt : arr[0].date },
                            author : arr[0].author
                        }).sort({date : -1}).limit(3).toArray(function(err, mfarr) {    
                            db.findToArray(require("./config.js").default(), 'entities', {_id : arr[0].author}, function(err, autarr) {
                                arr[0].authors = autarr;
                                arr[0].morefrom = mfarr;

                                var evts = hooks.getHooksFor('article_deepfetch');
                                var keys = Object.keys(evts);
                                var kIndex = -1;

                                var next = function() {
                                    kIndex++;

                                    if (kIndex == keys.length) {
                                        hooks.fire('article_will_render', {
                                            _c : conf,
                                            article: arr[0]
                                        });
                                    
                                        cb(arr[0]);
                                    } else {
                                        evts[keys[kIndex]].cb(conf, arr[0], next);
                                    }
                                };

                                next();
                            });
                        });
                    });
                });
            }
        });
    };

    this.refreshTagSlugs = function(_c, cb) {
        db.find(_c, 'content', {}, [], function(err, cursor) {
            var handleNext = function() {
                cursor.hasNext(function(err, hasnext) {
                    if (hasnext) {
                        cursor.next(function(err, dbart) {
                            var tagslugs = dbart.tags.map(function(tagname) {
                                return slugify(tagname).toLowerCase();
                            });

                            db.update(_c, 'content', {_id : db.mongoID(dbart._id)}, {tagslugs : tagslugs}, handleNext);
                        });
                    } else {
                        cb();
                    }
                });
            };

            handleNext();
        });
    };

    this.addFeature = function(cli) {
        var featurename = cli.postdata.data.feature;
        var conds = {
            _id : db.mongoID(cli.routeinfo.path[3])
        };        

        if (!cli.hasRight("editor")) {
            conds.author = db.mongoID(cli.userinfo.userid);
        }

        if (cli.postdata.data.overwrite !== true) {
            conds.feature = {$exists : false};
        }

        var featuredata = cli.postdata.data.props;

        db.update(cli._c, 'content', conds, {
            feature: featurename,
            featuredata : featuredata
        }, function() {
            log('Content', 'Added feature "' + featurename + '" to article with id ' + cli.routeinfo.path[3]);
            cli.sendJSON({done : true})
        });
    };

    this.create = function(cli) {
        cli.touch('article.create');
        var articleObject = {};

        articleObject.title = cli.postdata.data.title;
        articleObject.author = db.mongoID(cli.userinfo.userid);
        articleObject.updated = new Date();
        articleObject.status = "draft";
        articleObject.type = "post";

        db.insert(cli._c, 'content', articleObject, function(err, result) {
            var id = articleObject._id;
            cli.sendJSON({
                articleid : id,
                editurl : cli._c.server.url + "/admin/article/edit/" + id,
                error : err,
                valid : !err
            });
        });
    };

    this.publish = function(cli, pubCtx) {
        cli.touch('article.new');
        pubCtx = pubCtx || "create";

        var dbCol = {
            "create" : "content",
            "preview" : "preview"
        }

        var that = this;
        if (cli.hasRight('publish-articles')) {
            var form = formBuilder.handleRequest(cli);
            var response = formBuilder.validate(form, true);
            var oldSlug = "";

            var redirect = '';
            if (response.success) {
                var formData = formBuilder.serializeForm(form);
                formData.status = 'published';

                if (!cli.postdata.data._keepURL || cli.postdata.data._keepURL == "false") {
                    formData.name = slugify(formData.title).toLowerCase();
                    oldSlug = cli.postdata.data.currentSlug;
                }

                var newSlug = formData.name;

                formData.author = formData.author ? db.mongoID(formData.author) : cli.userinfo.userid;
                formData.date = dates.toTimezone(formData.date !== '' ? formData.date : new Date(), cli._c.timezone);
                formData.media = db.mongoID(formData.media);
                formData.updated = new Date();
                hooks.fire('article_will_' + pubCtx, {
                    cli: cli,
                    article: formData
                });

                var conds = cli.postdata.data.id ? {
                    _id: db.mongoID(cli.postdata.data.id)
                } : {
                    _id: db.mongoID()
                };

                if (formData.tags.map) {
                    formData.tagslugs = formData.tags.map(function(tagname) {
                        return slugify(tagname).toLowerCase();
                    });
                }

                // Create post
                var params = [cli._c, dbCol[pubCtx], conds];

                db.update.apply(db, [...params, formData, function(err, result) {
                    if (!err) {
                        var success = true;
                        var createdArticle = false;
                        if (result.upsertedId !== null) {
                            // Inserted a document
                            formData._id = result.upsertedId._id;
                            createdArticle = true;
                        } else if (result.modifiedCount > 0) {
                            // Updated a document
                            formData._id = cli.postdata.data.id;
                        } else {
                            // Nothing happened, failed...
                            success = false;
                        }

                        if (success) {
                            cli.did('content', 'published', {title : cli.postdata.data.title});

                            that.deepFetch(cli._c, db.mongoID(formData._id), function(deepArticle) {
                                if (pubCtx != "preview" && oldSlug && oldSlug != "") {
                                    db.update(cli._c, 'content', 
                                        {_id : db.mongoID(formData._id)}, 
                                        {$push : {aliases : oldSlug}}, 
                                    function() {
                                        log('Article', 'Added alias for slug ' + oldSlug);
                                    }, false, true, true);
                                }

                                var extra = new Object();
                                extra.ctx = "article";
                                extra.article = deepArticle;

                                if (pubCtx === "create") {
                                    cli.sendJSON({
                                        success: true,
                                        dbdata : deepArticle
                                    });

                                    // Generate LML page
                                    filelogic.renderThemeLML(cli, "article", deepArticle.name + '.html', extra , function(name) {
                                        // Remove autosaves related to this article
                                        if (cli.postdata.data.autosaveid) {
                                            db.remove(
                                                cli._c,
                                                'autosave',
                                                {
                                                    _id: db.mongoID(cli.postdata.data.autosaveid.replace(' ', ''))
                                                },
                                                function() {}
                                            );
                                        }
        
                                        var nlen = publishedNotificationTitles.length;
                                        var notifMessage = publishedNotificationTitles[Math.floor(nlen / Math.random()) % nlen];
    
                                        notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                            title: notifMessage,
                                            url: cli._c.server.url + '/' + deepArticle.name,
                                            msg: '<i>'+deepArticle.title+'</i> has been published. Click here to see it live.',
                                            type: 'success'
                                        });

                                        feed.plop(deepArticle._id, function() {
                                            feed.push(deepArticle._id, cli.userinfo.userid, 'published', cli._c.id, {
                                                title : deepArticle.title,
                                                subtitle : deepArticle.subtitle,
                                                slug : deepArticle.name,
                                                image : deepArticle.featuredimage[0].sizes.featured.url,
                                                authorname : deepArticle.authors[0].displayname,
                                                authoravatar : deepArticle.authors[0].avatarURL
                                            });
                                        });
    
                                        badges.check(cli, 'publish', function(acquired, level) {});
                                    });
                                } else if (pubCtx === "preview") {
                                    var tmpName = "static/tmp/preview" + 
                                        Math.random().toString().slice(2) + 
                                        Math.random().toString().slice(2) + 
                                        ".tmp";
                                    var absPath = cli._c.server.html + "/" + tmpName;

                                    filelogic.renderThemeLML(cli, "article", tmpName, extra , function() {
                                        log('Preview', 'Sending preview file before deletion : ' + absPath);
                                        var fileserver = require('./fileserver.js');
                                        fileserver.pipeFileToClient(cli, absPath, function() {
                                            fileserver.deleteFile(absPath, function() {});
                                        }, true);
                                    });
                                }
                            }, pubCtx == "preview");
                        } else {
                            cli.throwHTTP(500);
                        }

                    } else {
                        cli.throwHTTP(500);
                    }


                }, true, true]);

            } else {
                cli.sendJSON({
                    form: response
                });
            }
        } else {
            cli.throwHTTP(401);
        }
    };

    /**
     * Saves an article based on some parameters
     * The cli should contain (Both not mandatory):
     * - contentid, the id of the original content if the save is an autosave
     * - _id, the id of whether the original content or of the auto save if it is an autosave
     */
    this.save = function(cli, auto) {
        // Article already exists
        cli.postdata.data.form_name = "post_create";

        var form = formBuilder.handleRequest(cli);
        var formData = formBuilder.serializeForm(form);
        var id;

        if (cli.postdata.data.autosaveid) {
            db.remove(cli._c, 'autosave', {
                _id: db.mongoID(cli.postdata.data.autosaveid.replace(" ", ""))
            }, function() {});
        }

        formData.author = db.mongoID(cli.userinfo.userid);
        formData.media = db.mongoID(formData.media);
        formData.updated = new Date();

        if (formData.tags.map) {
            formData.tagslugs = formData.tags.map(function(tagname) {
                return slugify(tagname).toLowerCase();
            });
        }

        // Autosave
        if (auto) {
            // Check if article is edit, non-existing or published
            formData.status = 'autosaved';
            if (cli.postdata.data.contentid) {
                db.findAndModify(cli._c, 'content', {
                    _id: db.mongoID(cli.postdata.data.contentid)
                }, formData, function(err, doc) {
                    if (doc.value !== null) {

                        var val = doc.value;
                        // Is a draft article
                        cli.sendJSON({
                            success: true,
                            _id: val._id,
                            contentid: cli.postdata.data.contentid
                        });
                    } else {
                        formData.status = 'autosaved';
                        formData.contentid = db.mongoID(cli.postdata.data.contentid);
                        formData.date = new Date();

                        if (cli.postdata.data._id) {
                            // Autosave an autosaved version
                            db.update(cli._c, 'autosave', {_id: db.mongoID(cli.postdata.data._id)}, formData, function(err, doc) {
                                cli.sendJSON({
                                    success: true,
                                    _id: doc.insertedId,
                                    contentid: cli.postdata.data.contentid
                                });
                            });

                        } else {
                            // Is a published
                            db.insert(cli._c, 'autosave', formData, function(err, doc) {
                                cli.sendJSON({
                                    success: true,
                                    _id: doc.insertedId,
                                    contentid: cli.postdata.data.contentid
                                });
                            });
                        }

                    }

                })
            } else {
                formData.status = 'autosaved';

                if (cli.postdata.data._id) {

                    db.update(cli._c, 'autosave', {
                        _id: db.mongoID(cli.postdata.data._id)
                    }, formData, function() {
                        // Autosave updated
                        cli.sendJSON({
                            success: true,
                            _id: cli.postdata.data._id
                        });
                    })
                } else {
                    formData.date = new Date();

                    db.insert(cli._c, 'autosave', formData, function(err, doc) {
                        // Autosave created
                        cli.sendJSON({
                            success: true,
                            _id: doc.insertedId
                        });
                    });
                }

            }

        } else {
            if (cli.postdata.data._id) {
                // Update draft

                id = db.mongoID(cli.postdata.data._id);
                // Check if user can edit this article
                db.findToArray(cli._c, 'content', {
                    _id: id
                }, function(err, ress) {
                    var res = err ? undefined : ress[0];
                    if (!err && (res.author.toString() == cli.userinfo.userid.toString() || cli.hasRight('editor'))) {
                        db.update(cli._c, 'content', {
                            _id: id
                        }, formData, function(err, doc) {
                            cli.sendJSON({
                                success: true,
                                _id: cli.postdata.data._id
                            });
                        });
                    } else {
                        cli.sendJSON({
                            success: false,
                            _id: cli.postdata.data._id
                        });
                    }
                });
            } else {
                formData.date = new Date();
                // Create draft
                db.insert(cli._c, 'content', formData, function(err, doc) {
                    cli.sendJSON({
                        success: true,
                        redirect: cli._c.server.url + '/' + cli._c.paths.admin + '/article/edit/' + doc.insertedId
                    });
                });

            }
        }
    };

    this.preview = function(cli) {
        this.publish(cli, "preview");
        return;
    };

    this.edit = function(cli) {
        var that = this;
        if (cli.routeinfo.path[3]) {

            var id = db.mongoID(cli.routeinfo.path[3]);
            if (cli.method == 'POST') {

                var form = formBuilder.handleRequest(cli);
                var response = formBuilder.validate(form, true);

                if (response.success) {
                    formData = formBuilder.serializeForm(form);

                    if (!cli.postdata.data._keepURL) {
                        formData.name = slugify(formData.title).toLowerCase();
                    }

                    formData.media = db.mongoID(formData.media);
                    formData.updated = new Date();
                    formData.status = 'published';
                    formData.date = new Date(formData.date);

                    if (formData.tags.map) {
                        formData.tagslugs = formData.tags.map(function(tagname) {
                            return slugify(tagname).toLowerCase();
                        });
                    }

                    db.findToArray(cli._c, 'content', {
                        _id: id
                    }, function(err, row) {
                        if (err || row.length == 0) {
                            cli.sendJSON({
                                success: false,
                                error: "Content not found for id " + id
                            });

                            return;
                        }

                        // Check if user can edit this article
                        if (cli.userinfo.userid !== row[0]._id && !cli.hasRight('modify_all_articles')) {
                            cli.throwHTTP(405);
                        }

                        hooks.fire('article_will_edit', {
                            cli: cli,
                            old: row,
                            article: formData
                        });

                        db.findAndModify(cli._c, 'content', {
                            _id: id
                        }, formData, function(err, r) {
                            that.deepFetch(cli._c, id, function(deepArticle) {
                                cli.did('content', 'edited', {title : cli.postdata.data.title});
                                
                                hooks.fire('article_edited', {
                                    cli: cli,
                                    article: r.value
                                });
   
                                var extra = new Object();
                                extra.article = deepArticle;
                                extra.ctx = "article";
 
                                filelogic.renderThemeLML(cli, "article", formData.name + '.html', extra , function(name) {
                                    notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                        title: "Article is updated!",
                                        url: cli._c.server.url + '/' + formData.name,
                                        msg: "Your changes are live. Click to see the live article.",
                                        type: 'success'
                                    });
                                });
    
                                cli.sendJSON({
                                    success: true
                                });
                            });
                        });
                    });

                } else {
                    cli.sendJSON({
                        form: response
                    });
                }

            } else {
                filelogic.serveAdminLML(cli, true);
            }


        } else {
            cli.throwHTTP(404, 'Article Not Found');
        }
    }

    this.deleteAutosave = function(cli) {
        if (cli.routeinfo.path[3]) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            db.remove(cli._c, 'autosave', {
                _id: id
            }, function(err, res) {
                return cli.sendJSON({
                    redirect: cli._c.server.url + '/admin/article/list',
                    success: true
                });
            });
        }
    }

    this.delete = function(cli, destroy) {
        if (cli.routeinfo.path[3]) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            db.findToArray(cli._c, 'content', {
                _id: id
            }, function(err, results) {
                var result = err ? undefined : results[0];
                if (result) {
                    if (cli.hasRight('editor') || result.author.toString() == cli.userinfo.userid.toString()) {
                        // Can delete the current article

                        hooks.fire('article_will_delete', id);

                        db.update(cli._c, 'content', {
                            _id: id
                        }, {
                            status: destroy ? 'destroyed' : 'deleted'
                        }, function(err, r) {

                            cli.did('content', destroy ? 'destroyed' : 'deleted', {id : id});
                            
                            var filename = cli._c.server.html + "/" + result.name + '.html';
                            fs.deleteFile(filename, function() {
                                hooks.fire('article_deleted', id);
                                cacheInvalidator.removeFileToWatch(filename);
                            });

                            // Remove autosave pointing to article deleted
                            db.remove(cli._c, 'autosave', {
                                contentid: id
                            }, function() {
                                return cli.sendJSON({
                                    redirect: cli._c.server.url + '/admin/article/list',
                                    success: true
                                });
                            }, false);

                        });
                    } else {
                        return cli.throwHTTP(401);
                    }
                } else {
                    return cli.throwHTTP(404);
                }
            });


        } else {
            return cli.throwHTTP(404, 'Article Not Found');
        }
    }

    this.getArticle = function(cli) {
        var id = new mongo.ObjectID(cli.routeinfo.path[3]);
        db.find(cli._c, 'content', {
            '_id': id
        }, {
            limit: [1]
        }, function(err, cursor) {
            cursor.next(function(err, article) {
                if (article) {
                    cli.sendJSON({
                        form: formBuilder.unescapeForm(article)
                    });
                } else {
                    cli.throwHTTP(404, 'Article Not Found');
                }
                cursor.close();
            });
        });

        // Return article object from DB
    };


    this.registerContentLiveVar = function() {
        livevars.registerLiveVariable('content', function(cli, levels, params, callback) {
            var allContent = levels.length === 0;
            if (allContent) {
                if (cli.hasRight('editor')) {
                    db.singleLevelFind(cli._c, 'content', callback);
                } else {
                    db.findToArray(cli._c, 'content', {author : db.mongoID(cli.userinfo.userid)}, function(err, arr) {
                        callback(arr);
                    });
                }
            } else if (levels[0] == "all") {
                var sentArr = new Array();

                if (cli.hasRight("list-articles")) {
                    db.findToArray(cli._c, 'content', {}, function(err, arr) {
                        for (var i = 0; i < arr.length; i++) {
                            sentArr.push({
                                articleid: arr[i]._id,
                                name: arr[i].name,
                                title: arr[i].title
                            });
                        };
    
                        callback(sentArr);
                    });
                } else {
                    callback([]);
                }
            } else if (levels[0] == 'table') {
                if (!cli.hasRight("list-articles")) {
                    return callback({size:0,data:[],code:403});
                }

                var sort = {};
                sort[typeof params.sortby !== 'undefined' ? params.sortby : 'date'] = (typeof params.order == "undefined" ? -1 : params.order);
                // sort[typeof params.sortby !== 'undefined' ? '_id' : ''] = (typeof params.order == "undefined" ? -1 : params.order);

                var match = [{status : {$ne : "destroyed"}}];
                if (!cli.hasRight('editor')) {
                    match.push({author: db.mongoID(cli.userinfo.userid)});
                }
                if (params.search) {
                    match.push({
                        $text : { $search: params.search }
                    });
                }
    
                db.aggregate(cli._c, 'content', [{
                    $match: {$and : match}
                }, {
                    $sort: sort
                }, {
                    $skip : (params.skip || 0)
                }, {
                    $limit : (params.max || 20)
                }, {
                    $lookup: {
                        from: 'uploads',
                        localField: 'media',
                        foreignField: '_id',
                        as: 'media'
                    }
                }, {
                    $unwind: {
                        path: "$media",
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $unwind: {
                        path: "$author",
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $project: {
                        author: 1,
                        title: 1,
                        status: 1,
                        subtitle: 1,
                        name: 1,
                        date: 1,
                        media: "$media.sizes.thumbnail.url"
                    }
                }], function(data) {
                    db.count(cli._c, 'content', {$and : match}, function(err, total) {
                        callback({
                            size: total,
                            data: data
                        });
                    });
                });

            } else if (levels[0] == 'lastEdited') {
                if (!cli.hasRight("list-articles")) {
                    return callback({size:0,data:[],code:403});
                }

                db.aggregate(cli._c, 'autosave', [{
                    $lookup: {
                        from: 'content',
                        localField: 'contentid',
                        foreignField: '_id',
                        as: 'contentid'
                    }
                }, {
                    $unwind: {
                        path: '$contentid',
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $project: {
                        title: 1,
                        media: 1,
                        updated: 1,
                        contentid: 1,
                        author: 1,
                        newer: {
                            $cmp: ['$contentid.updated', '$updated']
                        }
                    }
                }, {
                    $match: {
                        $or: [{
                            contentid: null
                        }, {
                            $and: [{
                                author: db.mongoID(cli.userinfo.userid)
                            }, {
                                newer: {
                                    $lt: 0
                                }
                            }]
                        }]
                    }
                }, {
                    $sort: {
                        date: -1
                    }
                }, {
                    $limit: 5
                }], function(res) {
                    callback(res);

                });
            } else {
                if (!cli.hasRight("list-articles")) {
                    return callback({size:0,data:[],code:403});
                }

                // First, check for saved content
                db.aggregate(cli._c, 'content', [
                    {
                        $match : {_id: db.mongoID(levels[0])}
                    }
                ], function(arr) {
                    // Not found, lets check autosaves
                    if (arr && arr.length == 0) {
                        db.findToArray(cli._c, 'autosave', {
                            _id: db.mongoID(levels[0])
                        }, function(err, arr) {
                            // Check if there is a newer version than this autosave
                            if (arr && arr.length > 0) {
                                db.findToArray(cli._c, 'content', {
                                    _id: db.mongoID(arr[0].contentid),
                                    date: {
                                        "$gte": arr[0].date
                                    }
                                }, function(err, content) {
                                    if (content && content.length > 0) {
                                        arr[0].recentversion = content[0]._id;
                                    }

                                    db.findToArray(conf.default(), 'entities', {_id : arr[0].author}, function(err, autarr) {
                                        arr[0].authorname = autarr[0].displayname;
                                        arr[0].author = autarr;
                                        callback(arr);
                                    });
                                });
                            } else {
                                callback(arr);
                            }

                        });
                    } else {

                        // Found a content
                        if (arr && arr.length > 0) {
                            arr[0].authorname = arr[0].author[0] ? arr[0].author[0].displayname : "[NO AUTHOR]";
                            // Check if there is a newer autosaved version
                            db.findToArray(cli._c, 'autosave', {
                                contentid: db.mongoID(arr[0]._id),
                                updated: {
                                    "$gte": arr[0].updated
                                }
                            }, function(err, autosave) {
                                if (autosave && autosave.length > 0) {
                                    arr[0].recentversion = autosave[0]._id;
                                }
                                db.findToArray(conf.default(), 'entities', {_id : arr[0].author}, function(err, autarr) {
                                    arr[0].authorname = autarr ? autarr[0].displayname || "[No Author]";
                                    arr[0].author = autarr || {};
                                    callback(arr);
                                });
                            });
                        } else {
                            callback([])
                        }

                    }
                });
            }
        }, ["publish"]);

        livevars.registerLiveVariable('types', function(cli, levels, params, callback) {
            if (cli.hasRight("list-articles")) {
                return callback({size:0,data:[],code:403});
            }

            var allTypes = levels.length === 0;

            if (allTypes) {
                db.singleLevelFind(cli._c, 'types', callback);
            } else {
                db.multiLevelFind(cli._c, 'types', levels, {
                    name: levels[0]
                }, {}, callback);
            }
        }, ["types"]);
    }

    this.registerForms = function() {
        formBuilder.createForm('post_create', {
                formWrapper: {
                    'tag': 'div',
                    'class': 'row',
                    'id': 'article_new',
                    'inner': true
                },
                fieldWrapper : "lmlform-fieldwrapper"
            })
            .addTemplate('article_base')
            .addTemplate('media-explorer')
            .edit('media', undefined, {
                wrapper: {
                    'class': 'col-md-4'
                }
            })
            .add('categories', 'livevar', {
                wrapper: {
                    'class': 'col-md-4'
                },
                endpoint: 'categories',
                tag: 'select',
                template: 'option',
                title: 'role',
                attr: {
                    'lmlselect' : true
                },
                props: {
                    'value': 'name',
                    'html': 'displayname',
                    'header': 'Select One'
                },
                displayname: "Categories"
            })
            .add('tags', 'tags', {
                displayname: 'Tags',
                wrapper: {
                    'class': 'col-md-4'
                }
            })
            .trigger('fields')
            .add('title-featuredimage', 'title', {
                displayname : "Featured image information"
            })
            .add('featuredimageartist', 'text', {
                displayname : "Artist name"
            })
            .add('featuredimagelink', 'text', {
                displayname : "Artist link"
            })
            .add('title-postleaf', 'title', {
                displayname : "Interactive features"
            })
            .trigger('postleaf')
            .add('title-persona', 'title', {
                displayname : "Persona targeting"
            })
            .trigger('persona')
            .add('title-industry', 'title', {
                displayname : "Industry"
            })
            .add('industry', 'select', {
                displayname : "Industry Tag",
                datasource: [
                    {name : "realestate", displayName : "Real Estate"},
                    {name : "employment", displayName : "Employment"},
                    {name : "foodresto", displayName : "Food + Restaurants"},
                    {name : "nightlife", displayName : "Nightlife"},
                    {name : "hnf", displayName : "Health + Fitness"},
                    {name : "travel", displayName : "Travel"},
                    {name : "lodging", displayName : "Lodging"},
                    {name : "transportation", displayName : "Transportation"},
                    {name : "fashion", displayName : "Fashion"},
                    {name : "technology", displayName : "Technology"},
                    {name : "education", displayName : "Education"},
                    {name : "finance", displayName : "Finance"},
                    {name : "relationships", displayName : "Relationships + Sex"},
                    {name : "entertainment", displayName : "Entertainment + Tourism"},
                    {name : "info", displayName : "Info"},
                    {name : "sponsorship", displayName : "Sponsorship"}
                ]
            })
            .add('title-geolocation', 'title', {
                displayname : "Geolocalisation"
            })
            .add('geolocation', 'map', {
                notitle : true,
                format : 'array'
            })
            .add('title-author', 'title', {
                displayname : "Redaction"
            })
            .add('date', 'date', {
                displayname : "Publish date",
                datetime : true,
                context : 'edit'
            }, {
                required : false
            })
            .beginSection('authorbox', {
                "session.rights" : "edit-all-articles"
            })
            .add('author', 'livevar', {
                displayname : "Author",
                endpoint : "entities.simple",
                tag : "select",
                template: "option",
                title : "author",
                readkey : "author.0._id",
                attr: {
                    lmlselect : false
                },
                props: {
                    'value' : "_id",
                    'html' : 'displayname',
                    'header' : 'Select One'
                }
            })
            .closeSection('authorbox')
            .trigger('bottom')
            .add('title-action', 'title', {
                displayname: "Publish"
            })
            .add('publish-set', 'buttonset', { buttons : [{
                    'name' : 'save',
                    'displayname': 'Save draft',
                    'type' : 'button',
                    'classes': ['btn', 'btn-default, btn-save']
                }, {
                    'name' : 'preview',
                    'displayname': 'Preview',
                    'type' : 'button',
                    'classes': ['btn', 'btn-default, btn-preview']
                }, {
                    'name' : 'publish', 
                    'displayname': 'Save and <b>Publish</b>',
                    'type' : 'button',
                    'classes': ['btn', 'btn-default, btn-publish']
                }
            ]}
        );
    }

    cacheInvalidator.emitter.on('articleInvalidated', function(data) {

    });

    this.generateFromName = function(cli, articleName, cb, onlyPublished) {
        // Check for articles in db
        this.deepFetch(cli._c, articleName, function(deepArticle) {
            if (!deepArticle) {
                db.findToArray(cli._c, 'content', {aliases : articleName}, function(err, arr) {
                    if (err || !arr.length) {
                        cb(false);
                    } else {
                        cb(true, {
                            realName : arr[0].name
                        });
                    }
                }, {name : 1});
            } else {
                if (onlyPublished && deepArticle.status !== "published") {
                    cb(false);
                } else {
                    var extra = new Object();
                    extra.ctx = "article";
                    extra.article = deepArticle;
    
                    filelogic.renderThemeLML(cli, "article", articleName + '.html', extra , function(name) {
                        cacheInvalidator.addFileToWatch(articleName, 'articleInvalidated', deepArticle._id, cli._c);
                        cb(true);
                    });
                }
            }
        }, false, onlyPublished ? {status : "published"} : {});
    }

    var init = function() {
        tableBuilder.createTable({
            name: 'article',
            endpoint: 'content.table',
            paginate: true,
            searchable: true,
            max_results: 25,
            sortby : 'date',
            sortorder : -1,
            fields: [{
                key: 'media',
                displayname: 'Media',
                template: 'imgArticle',
                sortable: false,
                fixedWidth : 90
            }, {
                key: '',
                displayname: 'Title - Subtitle',
                template: 'table-article-title',
                sortable: true,
                sortkey: 'title'
            }, {
                key: 'status',
                displayname: 'Status',
                template: 'table-article-status',
                sortable: true
            }, {
                key: 'date',
                displayname: 'Publish date',
                template: 'table-article-date',
                sortable: true
            }, {
                key: 'author',
                displayname: 'Author',
                generator : "articleTableGenAuthor",
                sortable: true
            }, {
                key: '',
                displayname: 'Actions',
                template: 'table-article-actions',
                sortable: false
            }]
        });

    };

    init();
}

module.exports = new Article();
