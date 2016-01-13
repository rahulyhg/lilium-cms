// Add includes

var Article = function() {
	this.handlePOST = function(cli) {
		cli.touch('article.handlePOST');
		cli.debug();
	};

	this.handleGET = function(cli) {
		cli.touch('article.handleGET');
		cli.debug();
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

	init();
}

module.exports = new Article();
