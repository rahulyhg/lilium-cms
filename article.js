var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var Article = function() {
	this.handlePOST = function(cli) {
		cli.touch('article.handlePOST');
		switch (cli.routeinfo.path[2]) {
			case 'new':
				this.new(cli);
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
			case 'edit' :
				this.edit(cli);
				break;
			case 'getArticle' :
				this.getArticle(cli);
				case 'list' :
					this.list(cli);
					break;
			default:
				return cli.throwHTTP(404, 'Not Found');
				break;

		}
	};

	this.list = function(cli) {
		//Find the 25 first for now
		//TODO find a way to load more
		db.find('content', {},{limit:[25]}, function(err, cursor) {
			var contents = [];
			cursor.each(function(err, content) {
				if (content != null) {
					contents.push(content);
				} else {
					filelogic.serveLmlPage(cli, false, contents);
				}
			});
		});
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
						filelogic.renderLmlPostPage(cli, "article", result.ops[0], function(name){

							cli.sendJSON({
								redirect: name,
								form: {success : true}
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
			db.exists('content', {_id : id}, function(exists) {
				if (exists) {
					filelogic.serveLmlPage(cli, true);
				} else {
					cli.throwHTTP(404, 'Article Not Found');
				}
			});

		} else {
			cli.throwHTTP(404, 'Article Not Found');
		}
	}

	this.getArticle = function(cli) {
		// if (isNaN(postID)) {
		// 	// postID is a postname
		// } else {
		// 	// postID is an ID (int)
		// }

		var id = new mongo.ObjectID(cli.routeinfo.path[3]);
		db.find('content', {'_id' : id},{limit:[1]}, function(err, cursor) {
			cursor.next(function(err, article) {
				if (article) {
					cli.sendJSON({
						form: article
					});
				} else {
					cli.throwHTTP(404, 'Article Not Found');
				}
				cursor.close();
			});
		});



		// Return article object from DB
	};

	var init = function() {

	}

	var createPostForm = function() {
    formBuilder.createForm('post_create')
      .add('title', 'text', {}, {
        minLenght: 10,
        maxLenght: 23
      })
      .add('content', 'ckeditor')
      .add('active', 'checkbox')
      .add('onpage', 'number', {}, {
        min: 10,
        max: 15
      })
      .add('publish', 'submit');
  }


	init();
}

module.exports = new Article();
