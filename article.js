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
var moment = require('moment');

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
                if (cli.hasRightOrRefuse("publish")) this.publish(cli);
                break;
            case 'edit':
                if (cli.hasRightOrRefuse("publish")) this.edit(cli);
                break;
            case 'delete':
                if (cli.hasRightOrRefuse("publish")) this.delete(cli);
                break;
            case 'delete-autosave':
                this.deleteAutosave(cli);
                break;
            case 'autosave':
                this.save(cli, true);
                break;
            case 'save':
                this.save(cli);
                break;
            case 'preview':
                this.preview(cli);
                break;
            case 'destroy':
                if (cli.hasRightOrRefuse("destroy")) this.delete(cli, true);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;
        }
    };

    this.handleGET = function(cli) {
        cli.touch('article.handleGET');
        if (cli.routeinfo.path.length == 2) {
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "/list", true);
        } else {
            switch (cli.routeinfo.path[2]) {
                case 'new':
                    cli.hasRight('publish') ?
                        filelogic.serveAdminLML(cli) :
                        cli.refuse();
                    break;
                case 'edit':
                    if (cli.hasRight('publish')) {
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

    this.deepFetch = function(conf, idOrName, cb) {
        var cond = new Object();
        cond[typeof idOrName === "string" ? "name" : "_id"] = idOrName;

        db.join(conf, 'content', [
            {
               $match : cond
            }, {
                $lookup:{
                    from:           "uploads",
                    localField:     "media",
                    foreignField:   "_id",
                    as:             "featuredimage"
                }
            }, {
                $lookup:{
                    from:           "entities",
                    localField:     "author",
                    foreignField:   "_id",
                    as:             "authors"
                }
            }, {
                $lookup:{
                    from:           "uploads",
                    localField:     "authors.0.avatarID",
                    foreignField:   "_id",
                    as:             "authorface"
                }
            }
        ], function(arr) {
            if (arr.length === 0) {
                cb(new Error("No article found"));
            } else {
                db.rawCollection(conf, 'content', {"strict":true}, function(err, col) {
                    col.aggregate([{
                        $match : {
                            $text : { 
                                $search : arr[0].title.replace(/[^a-zA-Z\s]/g, '') 
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
                            arr[0].morefrom = mfarr;
                            cb(arr[0]);
                        });
                    });
                });
            }
        });
    };

    this.publish = function(cli) {
        cli.touch('article.new');
        var that = this;
        if (cli.hasRight('publish')) {
            var form = formBuilder.handleRequest(cli);
            var response = formBuilder.validate(form, true);

            var redirect = '';
            if (response.success) {
                var formData = formBuilder.serializeForm(form);
                formData.status = 'published';
                formData.name = slugify(formData.title).toLowerCase();
                formData.author = formData.author ? db.mongoID(formData.author) : cli.userinfo.userid;
                formData.date = new Date();
                formData.media = db.mongoID(formData.media);
                formData.updated = new Date();
                hooks.fire('article_will_create', {
                    cli: cli,
                    article: formData
                });

                var conds = cli.postdata.data.id ? {
                    _id: db.mongoID(cli.postdata.data.id)
                } : {
                    _id: db.mongoID()
                };

                // Create post
                db.update(cli._c, 'content', conds, formData, function(err, result) {
                    if (!err) {
                        var success = true;
                        if (result.upsertedId !== null) {
                            // Inserted a document
                            formData._id = result.upsertedId._id;
                        } else if (result.modifiedCount > 0) {
                            // Updated a document
                            formData._id = cli.postdata.data.id
                        } else {
                            // Nothing happened, failed...
                            success = false;
                        }

                        if (success) {
                            cli.sendJSON({
                                // redirect: cli._c.server.url + '/' + cli._c.paths.admin + '/article/edit/' + formData._id,
                                success: true
                            });

                            that.deepFetch(cli._c, db.mongoID(formData._id), function(deepArticle) {
                                var extra = new Object();
                                extra.ctx = "article";
                                extra.article = deepArticle;

                                // Generate LML page
                                filelogic.renderThemeLML(cli, "article", formData.name + '.html', extra , function(name) {
                                    cacheInvalidator.addFileToWatch(name, 'articleInvalidated', formData._id, cli._c);
    
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
                                        url: cli._c.server.url + '/' + formData.name,
                                        msg: '<i>'+deepArticle.title+'</i> has been published. Click here to see it live.',
                                        type: 'success'
                                    });
                                });
                            });
                        } else {
                            cli.throwHTTP(500);
                        }

                    } else {
                        cli.throwHTTP(500);
                    }


                }, true, true);

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

        // Autosave
        if (auto) {
            // Check if article is edit, non-existing or published
            formData.status = 'autosaved';
            if (cli.postdata.data.contentid) {
                formData.status = 'draft';

                db.findAndModify(cli._c, 'content', {
                    _id: db.mongoID(cli.postdata.data.contentid),
                    status: 'draft'
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
            formData.status = 'draft';
            formData.author = db.mongoID(cli.userinfo.userid);

            if (cli.postdata.data._id) {
                // Update draft

                id = db.mongoID(cli.postdata.data._id);
                // Check if user can edit this article
                db.findToArray(cli._c, 'content', {
                    _id: id
                }, function(err, ress) {
                    var res = err ? undefined : ress[0];
                    if (!err && (res.author.toString() == cli.userinfo.userid.toString() || cli.hasRight('edit-all-articles'))) {
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
        var form = formBuilder.handleRequest(cli);
        var formData = formBuilder.serializeForm(form);

        var extra = new Object();
        extra.article = formBuilder.unescapeForm(formData);
        extra.ctx = "article";

        // Generate LML page
        var tmpName = "static/tmp/preview" + Math.random().toString().slice(2) + Math.random().toString().slice(2) + ".tmp";
        var absPath = cli._c.server.html + "/" + tmpName;
        filelogic.renderThemeLML(cli, "article", tmpName, extra , function() {
            var fileserver = require('./fileserver.js');
            fileserver.pipeFileToClient(cli, absPath, function() {
                fileserver.deleteFile(absPath, function() {});
            }, true);
        });
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
                    formData.name = slugify(formData.title).toLowerCase();
                    formData.media = db.mongoID(formData.media);
                    formData.updated = new Date();
                    formData.status = 'published';

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
                    redirect: '/admin/article/list',
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
                    if (cli.hasRight('modify_all_articles') || result.author.toString() == cli.userinfo.userid.toString()) {
                        // Can delete the current article

                        hooks.fire('article_will_delete', id);

                        db.update(cli._c, 'content', {
                            _id: id
                        }, {
                            status: destroy ? 'destroyed' : 'deleted'
                        }, function(err, r) {

                            var filename = r.title + '.html';
                            fs.deleteFile(filename, function() {
                                hooks.fire('article_deleted', id);
                                cacheInvalidator.removeFileToWatch(filename);
                            });

                            // Remove autosave pointing to article deleted
                            db.remove(cli._c, 'autosave', {
                                contentid: id
                            }, function() {
                                return cli.sendJSON({
                                    redirect: '/admin/article/list',
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
                db.singleLevelFind(cli._c, 'content', callback);
            } else if (levels[0] == "all") {
                var sentArr = new Array();
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
            } else if (levels[0] == 'table') {
                var sort = {};
                sort[typeof params.sortby !== 'undefined' ? params.sortby : 'date'] = (params.order || -1);
                sort[typeof params.sortby !== 'undefined' ? '_id' : ''] = (params.order || -1);

                var match = [{status : {$ne : "destroyed"}}];
                if (!cli.hasRight('edit-all-articles')) {
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
                    $lookup: {
                        from: 'entities',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'author'
                    }
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
                        author: "$author.displayname",
                        title: 1,
                        status: 1,
                        subtitle: 1,
                        name: 1,
                        media: "$media.sizes.thumbnail.url"
                    }
                }, {
                    $sort: sort
                }, {
                    $skip: (params.skip || 0)
                }, {
                    $limit: (params.max || 20)
                }], function(data) {
                    db.find(cli._c, 'content', (params.search ? {
                        $text: {
                            $search: params.search
                        }
                    } : {}), [], function(err, cursor) {
                        cursor.count(function(err, size) {
                            results = {
                                size: size,
                                data: data
                            }
                            callback(err || results);

                        });
                    });
                });

            } else if (levels[0] == 'lastEdited') {

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
                    $limit: 3
                }], function(res) {
                    callback(res);

                });
            } else {

                // First, check for saved content
                db.aggregate(cli._c, 'content', [
                    {
                        $match : {_id: db.mongoID(levels[0])}
                    },
                    {
                        $lookup: {
                            from: 'entities',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'author'
                        }
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
                                    callback(arr);
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
                                callback(arr);
                            });
                        } else {
                            callback([])
                        }

                    }
                });
            }
        }, ["publish"]);

        livevars.registerLiveVariable('types', function(cli, levels, params, callback) {
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
                    'header': 'Select One',
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
            .beginSection('authorbox', {
                "session.rights" : "edit-all-articles"
            })
            .add('author', 'livevar', {
                displayname : "Author",
                endpoint : "entities",
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
                    'classes': ['btn', 'btn-default, btn-save']
                }, {
                    'name' : 'preview',
                    'displayname': 'Preview in new tab',
                    'classes': ['btn', 'btn-default, btn-preview']
                }, {
                    'name' : 'publish', 
                    'displayname': 'Save and <b>Publish</b>',
                    'classes': ['btn', 'btn-default, btn-publish']
                }
            ]}
        );
    }

    cacheInvalidator.emitter.on('articleInvalidated', function(data) {

    });

    this.generateFromName = function(cli, articleName, cb) {
        // Check for articles in db
        this.deepFetch(cli._c, articleName, function(deepArticle) {
            if (!deepArticle) {
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
        });
    }



    var init = function() {
        tableBuilder.createTable({
            name: 'article',
            endpoint: 'content.table',
            paginate: true,
            searchable: true,
            max_results: 25,
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
                key: 'author',
                displayname: 'Author',
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
