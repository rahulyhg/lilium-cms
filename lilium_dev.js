/*
 * Lilium dev environnement
 * Clears the cache everytime the server starts
 */
var lilium = require('./lilium.js');
var _config = require('./config.js');
var cli = require('./cli.js');
var log = require('./log.js');
var LiliumDev = function() {
	_config.default().env = 'dev';
	cli.cacheClear();
	log('Lilium','=========== DEV MODE ===========');
}
LiliumDev();
