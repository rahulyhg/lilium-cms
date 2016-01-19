var fileserver = require('../fileserver.js');
var _conf = require('../config.js');

var HTMLServer = function() {
	this.serveClient = function(cli) {
		cli.touch('htmlserver.serveClient');

		cli.routeinfo.mimetype = this.mimeOrRefused(cli.routeinfo.fileExt);

		var filename = _conf.default.server.html + cli.routeinfo.fullpath;

		fileserver.fileExists(filename, function (fileExists){

			if (fileExists) {
				fileserver.pipeFileToClient(cli, filename, function (){
					cli.touch('htmlserver.serveClient.callback');
				});
			}else{
				cli.throwHTTP(404, 'Not Found');
			}

		});

	};

	this.registerMime = function(ext, present) {
		if (!this.mimeRegistered(ext)) {
			_conf.default.MIMES[ext] = present;
		} else {
			throw "[HTMLServer - MimeException] MIMETYPE already registered.";
		}
	};

	this.mimeRegistered = function(ext) {
		return typeof _conf.default.MIMES[ext] !== 'undefined';
	};

	this.mimeOrRefused = function(ext) {
		return this.mimeRegistered(ext) ? _conf.default.MIMES[ext] : "application/x-lilium-nope";
	};

	var init = function() {

	};

	init();
};

module.exports = new HTMLServer();
