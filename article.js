var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var livevars = require('./livevars.js');
var cacheInvalidator = require('./cacheInvalidator.js');
var fs = require('./fileserver.js');
var notifications = require('./notifications.js');
var slugify = require('slugify');

var Article = function() {
    this.handlePOST = function(cli) {
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

    this.handleGET = function(cli) {
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

    this.list = function(cli) {
        filelogic.serveAdminLML(cli, false);
    }

    this.new = function(cli) {
        cli.touch('article.new');

        if (cli.method == 'POST') {
            var form = formBuilder.handleRequest(cli);

            var response = formBuilder.validate(form, true);

            var redirect = '';

            if (response.success) {
                var formData = formBuilder.serializeForm(form);
                formData.name = slugify(formData.title).toLowerCase();

                // Create post
                db.insert(cli._c, 'content', formData, function(err, result) {
                    // Generate LML page
                    filelogic.renderLmlPostPage(cli, "article",formBuilder.unescapeForm(result.ops[0]) , function(name) {
                        cacheInvalidator.addFileToWatch(name, 'articleInvalidated', result.ops[0]._id);
                        notifications.notifyUser(cli.userinfo.userid, {title: "Article is Live!", url: cli._c.server.url + '/' + formData.name, msg: "Your article is published. Click to see it live.", type: 'success'});
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

    this.edit = function(cli) {
        if (cli.routeinfo.path[3]) {

            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            if (cli.method == 'POST') {

                var form = formBuilder.handleRequest(cli);
                var response = formBuilder.validate(form, true);

                if (response.success) {

                    db.findAndModify(cli._c, 'content', {
                        _id: id
                    }, formBuilder.serializeForm(form), function(err, r) {
                        notifications.notifyUser(cli.userinfo.userid, {title: "Article is updated!", url: cli._c.server.url + '/' +  r.value.name , msg: "Your changes are live. Click to see the live article.", type: 'success'});

                        cli.sendJSON({
                            success: true
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
        if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);

            db.remove(cli._c, 'content', {
                _id: id
            }, function(err, r) {
                var filename = r.title + '.html';
                fs.deleteFile(filename, function() {
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
					articleid : arr[i]._id,
					title : arr[i].title
				});
			};

			callback(sentArr);
                });
        } else {
		db.multiLevelFind(cli._c, 'content', levels, {_id : new mongo.ObjectID(levels[0])}, {limit:[1]}, callback);
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
        formBuilder.createForm('post_create')
        .addTemplate('article_base')
        .trigger('bottom')
        .add('publish', 'submit');
    }

    cacheInvalidator.emitter.on('articleInvalidated', function(id) {
        // Invalidate article
        console.log('Article id is : ' + id);
    });


    var init = function() {};

    init();
}

module.exports = new Article();
