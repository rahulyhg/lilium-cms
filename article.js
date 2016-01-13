var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');

var Article = function() {
	this.handlePOST = function(cli) {
		cli.touch('article.handlePOST');
		switch (cli.routeinfo.path[2]) {
			case 'new':
				this.new(cli);
				break;
			default:

		}
	};

	this.handleGET = function(cli) {
		cli.touch('article.handleGET');
		switch (cli.routeinfo.path[2]) {
			case 'new':
				this.new(cli);
				break;
			default:

		}
	};

	this.list = function(cli) {

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
						console.log(result);
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

	this.getArticle = function(postID) {
		if (isNaN(postID)) {
			// postID is a postname
		} else {
			// postID is an ID (int)
		}

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
