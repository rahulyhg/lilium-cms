var fileserver = require('./fileserver.js');
var _c = require('./config.js');
var PluginHelper = function () {
	this.getPluginIdentifierFromFilename = function(filename, cb) {
        var conf = _c.default();

        //Remove base path
        var tempname = filename.replace(conf.server.base, '');
        if (tempname.startsWith(conf.paths.plugins + '/')) {
            // It is a plugin

            // Get the plugin base folder in case the filename is something like : plugins/test/random/content.js
            var pluginBaseFolder = tempname.replace(conf.paths.plugins + '/', '');
            pluginBaseFolder = pluginBaseFolder.substring(0, pluginBaseFolder.indexOf('/'));

            var infoPath =  conf.server.base + conf.paths.plugins + '/' + pluginBaseFolder + "/" + _c.default().paths.pluginsInfo;

            fileserver.fileExists(infoPath, function (exists) {
                if (exists) {
                    fileserver.readJSON(infoPath, function (json) {
                        cb((json.identifier) || false);
                    });
                }
            });
        } else {
            // Not a plugin
            return cb(false)
        }
    };
};

module.exports= new PluginHelper();
