var HTMLServer = function() {
	this.serveClient = function(cli) {
		cli.touch('htmlserver.serveClient');
		cli.debug();
	};

	var init = function() {

	};

	init();
};

module.exports = new HTMLServer();
