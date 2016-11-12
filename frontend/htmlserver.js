var fileserver = require('../fileserver.js');
var filelogic = require('../filelogic.js');
var _conf = require('../config.js');
var article = require('../article.js');

var HTMLServer = function() {
	this.serveClient = function(cli) {
		cli.touch('htmlserver.serveClient');

		cli.routeinfo.mimetype = this.mimeOrRefused(cli.routeinfo.fileExt);

		var filename = cli._c.server.html + cli.routeinfo.relsitepath;
		var htmlFile = filename + ".html";

		fileserver.fileExists(htmlFile, function (fileExists){
			if (fileExists) {
				cli.routeinfo.isStatic = true;
				fileserver.pipeFileToClient(cli, htmlFile, function() {
					cli.touch('htmlserver.serveClient.callback');
				});
			} else {
				fileserver.fileExists(filename, function (fileExists){
					if (fileExists) {
						// If html page requested from root
						if (cli.routeinfo.path.length == 1 && cli.routeinfo.relsitepath.indexOf('.html') !== -1) {
							cli.redirect(cli._c.server.url + cli.routeinfo.fullpath.slice(-5), true);
						} else {
							fileserver.pipeFileToClient(cli, filename, function (){
								cli.touch('htmlserver.serveClient.callback');
							});
						}
					} else {
						article.generateFromName(cli, cli.routeinfo.relsitepath.substring(1), function(success, details) {
							if (success) {
                                if (details && details.realName) {
                                    cli.redirect(cli._c.server.url + "/" + details.realName, true);
                                } else {
			    					cli.routeinfo.isStatic = true;
		    						fileserver.pipeFileToClient(cli, filename + '.html', function (){
	    								cli.touch('htmlserver.serveClient.callback');
    								});
                                }
							} else {
								// cli.throwHTTP(404, 'Not Found');
                                // 404
                                filelogic.serveErrorPage(cli, 404);
							}
						})
					}
				});
			}
		});

	};

	this.registerMime = function(ext, present) {
		if (!this.mimeRegistered(ext)) {
			_conf.default().MIMES[ext] = present;
		} else {
			throw "[HTMLServer - MimeException] MIMETYPE already registered.";
		}
	};

	this.mimeRegistered = function(ext) {
		return typeof _conf.default().MIMES[ext] !== 'undefined';
	};

	this.mimeOrRefused = function(ext) {
		return this.mimeRegistered(ext) ? _conf.default().MIMES[ext] : "application/x-lilium-nope";
	};

	var init = function() {

	};

	init();
};

module.exports = new HTMLServer();
