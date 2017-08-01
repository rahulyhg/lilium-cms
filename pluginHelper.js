class PluginHelper {
    getPluginIdentifierFromFilename(filename, cb, sync) {
        const fileserver = require('./fileserver.js');
        const conf = require('./config.js').default();

        let tempname = filename.replace(conf.server.base, '');
        if (tempname.startsWith(conf.paths.plugins + '/')) {
            let pluginBaseFolder = tempname.replace(conf.paths.plugins + '/', '');
            pluginBaseFolder = pluginBaseFolder.substring(0, pluginBaseFolder.indexOf('/'));

            let infoPath = conf.server.base + conf.paths.plugins + '/' + pluginBaseFolder + "/" + conf.paths.pluginsInfo;
            if (sync) {
                const exists = fileserver.fileExists(infoPath, undefined, true);
                if (exists) {
                    return fileserver.readJSON(infoPath, undefined, true).identifier || false;
                }
            } else {
                fileserver.fileExists(infoPath, (exists) => {
                    if (exists) {
                        fileserver.readJSON(infoPath, (json) => {
                            cb && cb((json.identifier) || false);
                        });
                    }
                });
            }
        } else {
            return cb ? cb(false) : false;
        }
    };
};

module.exports = new PluginHelper();
