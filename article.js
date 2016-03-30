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

var Article = function () {
    this.handlePOST = function (cli) {
        cli.touch('article.handlePOST');
        switch (cli.routeinfo.path[2]) {
        case 'new':
            this.new(cli);
            break;
        case 'edit':
            this.edit(cli);
            break;
        case 'delete':
            this.delete(cli);
            break;
        default:
            return cli.throwHTTP(404, 'Not Found');
            break;
        }
    };

    this.handleGET = function (cli) {
        cli.touch('article.handleGET');
        if (cli.routeinfo.path.length == 2) {
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "/list", true);
        } else {
            switch (cli.routeinfo.path[2]) {
            case 'new':
                this.new(cli);
                break;
            case 'edit':
                this.edit(cli);
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

    this.list = function (cli) {
        filelogic.serveAdminLML(cli, false);
    }

    this.new = function (cli) {
        cli.touch('article.new');

        if (cli.method == 'POST') {
            var form = formBuilder.handleRequest(cli);

            var response = formBuilder.validate(form, true);

            var redirect = '';

            if (response.success) {
                var formData = formBuilder.serializeForm(form);
                formData.name = slugify(formData.title).toLowerCase();
                formData.author = cli.userinfo.userid;
                formData.media = db.mongoID(formData.media);
                hooks.fire('article_will_create', {
                    cli: cli,
                    article: formData
                });
                // Create post
                db.insert(cli._c, 'content', formData, function (err, result) {
                    if (!err) {
                        formData._id = result.insertedId;
                        hooks.fire('article_created', {
                            cli: cli,
                            article: formData
                        });
                    }

                    // Generate LML page
                    filelogic.renderLmlPostPage(cli, "article", formBuilder.unescapeForm(result.ops[0]), function (name) {
                        cacheInvalidator.addFileToWatch(name, 'articleInvalidated', result.ops[0]._id, cli._c);
                        notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                            title: "Article is Live!",
                            url: cli._c.server.url + '/' + formData.name,
                            msg: "Your article is published. Click to see it live.",
                            type: 'success'
                        });
                        cli.sendJSON({
                            redirect: cli._c.server.url + "/" + name,
                            form: {
                                success: true
                            }
                        });

                    });
                });

            } else {
                cli.sendJSON({
                    form: response
                });
            }

        } else {
            filelogic.serveAdminLML(cli);
        }

    };

    this.edit = function (cli) {
        if (cli.routeinfo.path[3]) {

            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            if (cli.method == 'POST') {

                var form = formBuilder.handleRequest(cli);
                var response = formBuilder.validate(form, true);

                if (response.success) {
                    formData = formBuilder.serializeForm(form);
                    formData.name = slugify(formData.title).toLowerCase();
                    formData.media = db.mongoID(formData.media);

                    db.find(cli._c, 'content', {
                        _id: id
                    }, [], function (err, row) {
                        if (!err) {
                            cli.sendJSON({
                                success: false,
                                error: "Content not found for id " + id
                            });

                            return;
                        }

                        hooks.fire('article_will_edit', {
                            cli: cli,
                            old: row,
                            article: formData
                        });

                        db.findAndModify(cli._c, 'content', {
                            _id: id
                        }, formData, function (err, r) {
                            hooks.fire('article_edited', {
                                cli: cli,
                                article: r.value
                            });
                            filelogic.renderLmlPostPage(cli, "article", r.value, function (name) {
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

    this.delete = function (cli) {
        if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);

            hooks.fire('article_will_delete', id);

            db.remove(cli._c, 'content', {
                _id: id
            }, function (err, r) {
                var filename = r.title + '.html';
                fs.deleteFile(filename, function () {

                    hooks.fire('article_deleted', id);

                    cacheInvalidator.removeFileToWatch(filename);
                    return cli.sendJSON({
                        redirect: '/admin/article/list',
                        success: true
                    });
                });

            });
        } else {
            return cli.throwHTTP(404, 'Article Not Found');
        }
    }

    this.getArticle = function (cli) {
        var id = new mongo.ObjectID(cli.routeinfo.path[3]);
        db.find(cli._c, 'content', {
            '_id': id
        }, {
            limit: [1]
        }, function (err, cursor) {
            cursor.next(function (err, article) {
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


    this.registerContentLiveVar = function () {
        livevars.registerLiveVariable('content', function (cli, levels, params, callback) {
            var allContent = levels.length === 0;
            if (allContent) {
                db.singleLevelFind(cli._c, 'content', callback);
            } else if (levels[0] == "all") {
                var sentArr = new Array();
                db.findToArray(cli._c, 'content', {}, function (err, arr) {
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
                db.aggregate(cli._c, 'content', [{
                    $match: (params.search ? {
                        $text: {
                            $search: params.search
                        }
                    } : {})

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
                }], function (data) {
                    db.find(cli._c, 'content', (params.search ? {
                        $text: {
                            $search: params.search
                        }
                    } : {}), [], function (err, cursor) {

                        cursor.count(function (err, size) {
                            results = {
                                size: size,
                                data: data
                            }
                            callback(err || results);

                        });
                    });
                });


            } else {
                db.multiLevelFind(cli._c, 'content', levels, {
                    _id: new mongo.ObjectID(levels[0])
                }, {
                    limit: [1]
                }, callback);
            }
        }, ["content"]);

        livevars.registerLiveVariable('types', function (cli, levels, params, callback) {
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

    this.registerForms = function () {
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
            .add('publish', 'submit');
    }

    cacheInvalidator.emitter.on('articleInvalidated', function (data) {

    });

    this.generateFromName = function (cli, articleName, cb) {
        // Check for articles in db
        db.findToArray(cli._c, 'content', {
            name: articleName
        }, function (err, arr) {

            if (arr[0]) {
                // Generate LML page
                filelogic.renderLmlPostPage(cli, "article", arr[0], function (name) {
                    cacheInvalidator.addFileToWatch(name, 'articleInvalidated', arr[0]._id, cli._c);
                    cb(true);

                });
            } else {
                cb(false);
            }
        })
    }



    var init = function () {

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
