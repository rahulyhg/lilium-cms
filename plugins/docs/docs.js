var log = undefined;
var _c = undefined;
var endpoints = undefined;
var admin = undefined;
var filelogic = undefined;
var fileserver = undefined;
var lmllib = undefined;

var Docs = function() {
	this.iface = new Object();

	var initRequires = function(abspath) {
		log = require(abspath + "log.js");
		_c = require(abspath + 'config.js');
		endpoints = require(abspath + "endpoints.js");
		admin = require(abspath + '/backend/admin.js');
		filelogic = require(abspath + 'filelogic.js');
		fileserver = require(abspath + 'fileserver.js');
		lmllib = require(abspath + 'lmllib.js');
	};

	var registerEndpoint = function() {
		admin.registerAdminEndpoint('docs', 'GET', function(cli) {
			cli.touch('docs.GET.docs');
			var paths = cli.routeinfo.path;
			var isRoot = paths.length == 2;
			var rootLMLDir = _c.default.server.base + "plugins/docs/";		
			var rootLMLFile = rootLMLDir + "html/index.lml";
			var savePath = _c.default.server.html + "/admin/docs/";
			var contentName = isRoot ? "" : paths[2];

			if (isRoot) {
				rootLMLDir += "content/index.lml";
				savePath += "index.html";
			} else {
				rootLMLDir += "content/" + contentName + ".doc";
				savePath += contentName + ".html";
			}

			cli.routeinfo.isStatic = true;
			filelogic.serveAbsoluteLml(rootLMLFile, savePath, cli, {libname : (isRoot ? "index" : contentName)});
		});
	};

	var registerLMLContextLib = function() {
		lmllib.registerContextLibrary('docscontent', function(context) {
			return {
				render : function() {
					var libname = context.extra.libname;
					var docFilePath = _c.default.server.base + "plugins/docs/content/" + libname + ".doc";

					return fileserver.readFileSync(docFilePath);
				},
				listDir : function() {
					var docFilePath = _c.default.server.base + "plugins/docs/content/";
					var files = fileserver.listDirContentSync(docFilePath);

					for (var i = 0; i < files.length; i++) {
						var endpoint = files[i].replace('.doc', '');
						files[i] = {
							displayname : (endpoint == 'index' ? 'Lilium Docs' : endpoint),
							url : _c.default.server.url + "/admin/docs/" + (endpoint == "index" ? "" : endpoint)
						};
					}
		
					return files;
				}
			}
		});
	};

	this.unregister = function(callback) {
		admin.unregisterAdminEndpoint('docs', 'GET');
		callback();
	};

	this.register = function(_c, info, callback) {
		initRequires(_c.default.server.base);
		log("Docs", "Documentation was initiated");
		registerEndpoint();
		registerLMLContextLib();
		
		log("Docs", "Documentation was initiated");
		callback();
	};
};

module.exports = new Docs();
