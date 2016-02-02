var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var livevars = require('./livevars.js');
var cacheInvalidator = require('./cacheInvalidator.js');
var fs = require('./fileserver.js');

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
  };

  this.list = function(cli) {
    filelogic.serveLmlPage(cli, false);
  }

  this.new = function(cli) {
    cli.touch('article.new');
    if (!formBuilder.isAlreadyCreated('post_create')) {
      createPostForm();
    }
    if (cli.method == 'POST') {
      var form = formBuilder.handleRequest(cli);
      var response = formBuilder.validate(form, true);
      var redirect = '';

      if (response.success) {
        // Create post
        db.insert('content', formBuilder.serializeForm(form), function(err, result) {

          // Generate LML page
          filelogic.renderLmlPostPage(cli, "article", formBuilder.unescapeForm(result.ops[0]), function(name) {
            cacheInvalidator.addFileToWatch(name, 'articleInvalidated', result.ops[0]._id);
            cli.sendJSON({
              redirect: conf.default.server.url + "/" + name,
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
      filelogic.serveLmlPage(cli);
    }

  };

  this.edit = function(cli) {
    if (cli.routeinfo.path[3]) {
      if (!formBuilder.isAlreadyCreated('post_create')) {
        createPostForm();
      }
      var id = new mongo.ObjectID(cli.routeinfo.path[3]);
      if (cli.method == 'POST') {

        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);

        if (response.success) {

          db.update('content', {
            _id: id
          }, formBuilder.serializeForm(form), function(err, r) {
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
        db.exists('content', {
          _id: id
        }, function(exists) {
          if (exists) {
            filelogic.serveLmlPage(cli, true);
          } else {
            cli.throwHTTP(404, 'Article Not Found');
          }
        });
      }


    } else {
      cli.throwHTTP(404, 'Article Not Found');
    }
  }

  this.delete = function(cli) {
    if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {
      var id = new mongo.ObjectID(cli.routeinfo.path[3]);

      db.remove('content', {_id : id},function(err, r){
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
    db.find('content', {
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
        db.singleLevelFind('content', callback);
      } else {
        db.multiLevelFind('content', levels, {_id : new mongo.ObjectID(levels[0])}, {limit:[1]}, callback);
      }
    });
  }

  var createPostForm = function() {
    formBuilder.createForm('post_create')
      .add('title', 'text', {}, {
        minLenght: 3,
        maxLenght: 100
      })
      .add('content', 'ckeditor')
      .add('publish', 'submit');
  }

  cacheInvalidator.emitter.on('articleInvalidated',function(id) {
    console.log('Article id is : '+ id);
  });


  var init = function() {};

  init();
}

module.exports = new Article();
