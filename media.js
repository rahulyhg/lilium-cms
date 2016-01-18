var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');

var Media = function() {
	this.handlePOST = function(cli) {
		cli.touch('article.handlePOST');
		switch (cli.routeinfo.path[2]) {
			case 'upload':
				this.upload(cli);
				break;
			default:

		}
	};

	this.handleGET = function(cli) {
		cli.touch('article.handleGET');
		switch (cli.routeinfo.path[2]) {
			case 'upload':
				this.upload(cli);
				break;
			default:

		}
	};

	this.list = function(cli) {

	}

	this.upload = function(cli) {
		cli.touch('media.new');

      if (!formBuilder.isAlreadyCreated('media_create')) {
        createMediaForm();
      }

      if (cli.method == 'POST') {
        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);

        if (response.success) {
          // var url = conf.default.server.url + "/uploads/" + cli.postdata.uploads[0].url;
          // Create post
							cli.sendJSON({
								form: {redirect : '' ,success : true}
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

	var createMediaForm = function() {
    formBuilder.createForm('media_create')
      .add('File', 'file')
      .add('publish', 'submit');
  }


	init();
}

module.exports = new Media();
