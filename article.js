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

var Article = function() {
    this.handlePOST = function(cli) {
        cli.touch('article.handlePOST');
        switch (cli.routeinfo.path[2]) {
            case 'new':
                this.publish(cli);
                break;
            case 'edit':
                this.edit(cli);
                break;
            case 'delete':
                this.delete(cli);
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
                    filelogic.serveAdminLML(cli);
                    break;
                case 'edit':
                    if (cli.routeinfo.path[3] && cli.routeinfo.path[3] == 'autosave') {
                        filelogic.serveAdminLML(cli, true);
                    } else {
                        this.edit(cli);
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
                    break;

            }
        }
    };

    this.list = function(cli) {
        filelogic.serveAdminLML(cli, false);
    }

    this.publish = function(cli) {
        cli.touch('article.new');
        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);

        var redirect = '';
        if (response.success) {
            var formData = formBuilder.serializeForm(form);
            formData.status = 'published';
            formData.name = slugify(formData.title).toLowerCase();
            formData.author = cli.userinfo.userid;
            formData.date = new Date();
            formData.media = db.mongoID(formData.media);
            formData.updated = new Date();
            hooks.fire('article_will_create', {
                cli: cli,
                article: formData
            });
            // Create post
            db.insert(cli._c, 'content', formData, function(err, result) {
                if (!err) {
                    formData._id = result.insertedId;
                    hooks.fire('article_created', {
                        cli: cli,
                        article: formData
                    });
                }

                // Generate LML page
                filelogic.renderLmlPostPage(cli, "article", formBuilder.unescapeForm(result.ops[0]), function(name) {
                    cacheInvalidator.addFileToWatch(name, 'articleInvalidated', result.ops[0]._id, cli._c);
                    notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                        title: "Article is Live!",
                        url: cli._c.server.url + '/' + formData.name,
                        msg: "Your article is published. Click to see it live.",
                        type: 'success'
                    });
                    cli.sendJSON({
                        redirect: cli._c.server.url + '/' + cli._c.paths.admin + '/article/edit/' + result.ops[0]._id,
                        success: true
                    });

                });
            });

        } else {
            cli.sendJSON({
                form: response
            });
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

                        // Is a published
                        db.insert(cli._c, 'autosave', formData, function(err, doc) {
                            cli.sendJSON({
                                success: true,
                                _id: doc.insertedId,
                                contentid: cli.postdata.data.contentid
                            });
                        });
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
                db.find(cli._c, 'content', [], {
                    _id: id
                }, function(err, res) {
                    if (res && (res._id == cli.userinfo.userid || cli.hasRight('edit-all-articles'))) {

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

    }
    this.preview = function(cli) {
        var form = formBuilder.handleRequest(cli);
        var formData = formBuilder.serializeForm(form);

        filelogic.compileLmlPostPage(cli, "article", formData, function(html) {
            var fileserver = require('./fileserver.js');
            fileserver.pipeContentToClient(cli, html);
        });
    };

    this.edit = function(cli) {
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
                            hooks.fire('article_edited', {
                                cli: cli,
                                article: r.value
                            });
                            filelogic.renderLmlPostPage(cli, "article", r.value, function(name) {
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

    this.delete = function(cli) {
        if (cli.routeinfo.path[3]) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);

            db.find(cli._c, 'content', {
                _id: id
            }, function(err, result) {
                if (result) {
                    if (cli.hasRight('modify_all_articles') || result._id == cli.userinfo.userid) {
                        // Can delete the current article

                        hooks.fire('article_will_delete', id);

                        db.remove(cli._c, 'content', {
                            _id: id
                        }, function(err, r) {
                            var filename = r.title + '.html';
                            fs.deleteFile(filename, function() {

                                hooks.fire('article_deleted', id);

                                cacheInvalidator.removeFileToWatch(filename);
                                return cli.sendJSON({
                                    redirect: '/admin/article/list',
                                    success: true
                                });
                            });

                        });
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
                sort[typeof params.sortby !== 'undefined' ? params.sortby : '_id'] = (params.order || 1);
                sort[typeof params.sortby !== 'undefined' ? '_id' : ''] = (params.order || 1);
                var match = !cli.hasRight('edit-all-articles') ? {
                    author: db.mongoID(cli.userinfo.userid)
                } : {};

                db.aggregate(cli._c, 'content', [{
                    $match: (params.search ? {
                            $and: [{
                                $text: {
                                    $search: params.search
                                }
                            }, match]
                        } :
                        match
                    )

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
                        media: "$media.sizes.medium.url"
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
                        newer: {
                            $cmp: ['$contentid.updated', '$updated']
                        }

                    }
                }, {
                    $match: {$or : [{contentid :null}, {$and : [{author : db.mongoID(cli.userinfo.userid)}, {newer : { $lt : 0}}]}]}
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
                db.findToArray(cli._c, 'content', {
                    _id: db.mongoID(levels[0])
                }, function(err, arr) {
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
                                    callback(err || arr);
                                });
                            } else {
                                callback(err || arr);
                            }

                        });
                    } else {
                        // Found a content
                        if (arr) {
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
                                callback(err || arr);
                            });
                        } else {
                            // Error :(
                            callback(err);
                        }

                    }
                });
            }
        }, ["content"]);

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
                }
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
                    'multiselect': true
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
            .trigger('bottom')
            .add('save', 'button', {
                'displayname': 'Save draft',
                'classes': ['btn', 'btn-default', 'fullwidth'],
                'wrapper': {
                    'class': 'col-md-4'
                }
            })
            .add('preview', 'button', {
                'displayname': 'Preview in new tab',
                'classes': ['btn', 'btn-default', 'fullwidth'],
                'wrapper': {
                    'class': 'col-md-4'
                }
            })
            .add('publish', 'button', {
                'displayname': 'Save and <b>Publish</b>',
                'classes': ['btn', 'btn-default', 'fullwidth'],
                'wrapper': {
                    'class': 'col-md-4'
                }
            });
    }

    cacheInvalidator.emitter.on('articleInvalidated', function(data) {

    });

    this.generateFromName = function(cli, articleName, cb) {
        // Check for articles in db
        db.findToArray(cli._c, 'content', {
            name: articleName
        }, function(err, arr) {

            if (arr[0]) {
                // Generate LML page
                filelogic.renderLmlPostPage(cli, "article", arr[0], function(name) {
                    cacheInvalidator.addFileToWatch(name, 'articleInvalidated', arr[0]._id, cli._c);
                    cb(true);

                });
            } else {
                cb(false);
            }
        })
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
                displayname: 'Featured Image',
                template: 'imgArticle',
                sortable: false
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
