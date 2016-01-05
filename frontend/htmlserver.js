var fileserver = require('../fileserver.js');
var _conf = require('../config.js');

var MIMES = {
	"" : "text/html",
	".html" : "text/html",
	".htm" : "text/html",
	".css" : "text/css",
	".js" : "text/javascript",
	".png" : "image/png",
	".jpg" : "image/jpeg",
	".jpeg" : "image/jpeg",
	".bmp" : "image/bmp",
	".gif" : "image/gif",
	".swf" : "application/x-shockwave-flash",
	".lml" : "application/x-lilium-markup"
}

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
			MIMES[ext] = present;
		} else {
			throw "[HTMLServer - MimeException] MIMETYPE already registered.";
		}
	};

	this.mimeRegistered = function(ext) {
		return typeof MIMES[ext] !== 'undefined';
	};

	this.mimeOrRefused = function(ext) {
		return this.mimeRegistered(ext) ? MIMES[ext] : "application/x-lilium-nope";
	};

	var init = function() {

	};

	init();
};

module.exports = new HTMLServer();
