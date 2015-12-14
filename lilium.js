/*
 * Lilium - CMS
 *
 * This is the entry point. Lilium is built for running with Forever using
 * a simple "forever start lilium" command. Since it has its own process,
 * it is possible to monitor the said process async. 
 *
 */
var startupTime = new Date();

// Inclusions
var _config = require('./config.js'); 
var core = require('./core.js');
var ClientObject = require('./clientobject.js');
var Inbound = require('./inbound.js');
var Handler = require('./handler.js');
var log = require('./log.js');

var Lilium = function() {
	var init = function() {
		log('Lilium', 'Starting up...');
		core.makeEverythingSuperAwesome(function() {
			log('Lilium', 'Initialization signal received');
			Inbound.bind('onRequest', function(req, resp) {
				// Run main modules
				var clientObject = new ClientObject(req, resp);
				Handler.handle(clientObject);
			});

			log('Lilium', 'Starting inbound server');	
			Inbound.start();
			log('Config', 'App is located at ' + _config.default.server.base);
			log('Config', 'Root PATH is at ' + _config.default.server.html);
			log('Config', 'Root URL is at ' + _config.default.server.url);
			log('Config', 'Public signature ' + _config.default.signature.publichash);
			log();
			log('Lilium', ' *** Running ' + _config.default.vendor.productname + ' v' + _config.default.vendor.version + ' ***');
			log();
			log('Benchmark', 'Init time : ' + (new Date() - startupTime) + "ms");
			log('Developer', 'Documentation : http://liliumcms.com/docs');
			log('Developer', 'Hit me up at : http://erikdesjardins.com !');
			log();
			log('Developer', 'With love; enjoy. <3');	
		});
	};

	this.cms = function() {
		init();
	};
};

(new Lilium()).cms();
