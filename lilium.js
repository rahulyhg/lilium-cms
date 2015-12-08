/*
 * Lilium - CMS
 *
 * This is the entry point. Lilium is built for running with Forever using
 * a simple "forever start lilium" command. Since it has its own process,
 * it is possible to monitor the said process async. 
 *
 */

var _config = require('./config.js'); 
var ClientObject = require('./clientobject.js');
var Inbound = require('./inbound.js');
var Handler = require('./handler.js');

var Lilium = function() {
	var init = function() {
		Inbound.bind('onRequest', function(req, resp) {
			// Run main modules
			var clientObject = new ClientObject(req, resp);
			Handler.handle(clientObject);
		});

		Inbound.start();		
	};

	this.cms = function() {
		init();
	};
};

(new Lilium()).cms();
