// Will handle the requests and send info to the appropriate dispatcher
var Router = require('./router.js');
var Dispatcher = require('./dispatcher.js');

var Handler = function() {
	var GET = function(cli) {
		Router.parseClientObject(cli);
		Dispatcher.dispatch(cli);
	};

	var POST = function(cli) {
		
	};

	var notSupported = function(cli) {
		cli.throwHTTP(405, 'Method Not Allowed');
	};

	var parseMethod = function(cli) {
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
		parseMethod(cli);
	};

	var init = function() {

	};

	init();
};

module.exports = new Handler();
