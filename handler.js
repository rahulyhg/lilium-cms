// Will handle the requests and send info to the appropriate dispatcher
var Router = require('./router.js');
var Dispatcher = require('./dispatcher.js');

var Handler = function() {
	var GET = function(cli) {
		cli.touch('handler.GET');

		Router.parseClientObject(cli);
		Dispatcher.dispatch(cli);
	};

	var POST = function(cli) {
		cli.touch('handler.POST');
		cli.debug();
	};

	var notSupported = function(cli) {
		cli.throwHTTP(405, 'Method Not Allowed');
	};

	var parseMethod = function(cli) {
		cli.touch('handler.parseMethod');

		switch (cli.method) {
			case 'GET': 
				GET(cli);
				break;
			case 'POST':
				POST(cli);
				break;
			default:
 				notSupported(cli);
				break;
		}
	};
	
	this.handle = function(cli) {
		cli.touch('handler.handle');	
		parseMethod(cli);
	};

	var init = function() {

	};

	init();
};

module.exports = new Handler();
