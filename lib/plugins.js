const fs = require('fs');
const _c = require('../lib/config');
const filelogic = require('../pipeline/filelogic');

const db = require('../lib/db.js');
const hooks = require('../hooks.js');
const RegisteredPlugins = {};

class Plugins {
    searchDirForPlugin(identifier, callback) {
        this.getPluginsDirList( (list) =>{
            var pluginInfo = undefined;

            for (var i = 0; i < list.length; i++) {
                if (list[i].identifier == identifier) {
                    pluginInfo = list[i];
                    break;
                }
            }

            callback(pluginInfo);
        });
    };

    getPluginsDirList(callback) {
        var plugindir = _c.default().server.base + _c.default().paths.plugins + "/";

        fs.readdir(plugindir,(err, dirs) => {
            if (err) {
                throw new Error("[PluginException] Could not access plugin directory : " + err);
            }

            var allPlugins = [];

            var i = -1;
            const nextDir = () => {
                i++;
                if (i >= dirs.length) {
                    callback(allPlugins);
                } else {
                    var infoPath = plugindir + dirs[i] + "/" + _c.default().paths.pluginsInfo;
                    filelogic.fileExists(infoPath, (exists) => {
                        if (exists) {
                            filelogic.readJSON(infoPath, (json) => {
                                json.dirName = dirs[i];
                                allPlugins.push(json);
                                nextDir();
                            });
                        } else {
                            nextDir();
                        }
                    });
                }
            };

            nextDir();
        });
    };

    isRegistered(identifier) {
        return typeof RegisteredPlugins[identifier] !== 'undefined';
    };

    registerPlugin(identifier, callback) {
        if (this.isRegistered(identifier)) {
            log('Plugins', new Error("[PluginException] Cannot register already registered plugin with identifier " + identifier), 'err');
            callback();
            return;
        } else {
            log('Plugins', 'Registering plugin with identifier ' + identifier);
            this.searchDirForPlugin(identifier,  (info) =>{
                if (!info) {
                    log("PluginException", "Could not find any info on plugin with identifier " + identifier, 'warn');
                    return callback();
                }

                try {
                    var plugindir = require('path').join(liliumroot, "plugins", info.dirName, info.entry);
                    var pluginInstance = require(plugindir);

                    RegisteredPlugins[identifier] = pluginInstance;

                    db.update(_c.default(), 'plugins', {
                        identifier: identifier
                    }, {
                        identifier: identifier,
                        active: true
                    },  () =>{
                        if (typeof pluginInstance.register !== 'function') {
                            log("Plugins", 'Plugin has no method "register"', 'warn');
                            hooks.fire('pluginregistered', {identifier});

                            callback();
                        } else {
                            log('Plugins', "Calling register method on plugin with identifier " + identifier);
                            try {
                                pluginInstance.register(_c, info,  () =>{
                                    log('Plugins', 'Registered ' + identifier, 'success');
                                    hooks.fire('pluginregistered', {identifier});
                                    callback();
                                });
                            } catch (e) {
                                log("Plugins", "Error while registering plugin " + identifier + ": " + e.message, 'err');
                                e.stack && log("Plugins", e.stack, 'err');
                            }
                        }
                    }, true, true);
                } catch (ex) {
                    log("Plugins", "Could not register plugin [" + identifier + "] because of an exception : " + ex, 'err');
                    log("Plugins", ex.stack, 'err');
                    callback();
                }
            });
        }
    };

    unregisterPlugin(identifier, callback) {
        if (this.isRegistered(identifier)) {
            db.update(_c.default(), 'plugins', {
                identifier: identifier
            }, {
                identifier: identifier,
                active: false
            },  () =>{
                try {
                    RegisteredPlugins[identifier].unregister( () =>{
                        hooks.fire('plugindisabled', {identifier});

                        RegisteredPlugins[identifier] = undefined;
                        delete RegisteredPlugins[identifier];
                    });
                } catch(e) {
                    log('Plugin', e, 'err');
                }

            }, true, true);

        } else {
            log('Plugins', new Error("[PluginException] Cannot unregister unregistered plugin with identifier " + identifier));
        }
    };

    getIface(identifier) {
        if (this.isRegistered(identifier)) {
            if (typeof RegisteredPlugins[identifier].iface === 'object') {
                return RegisteredPlugins[identifier].iface;
            } else {
                throw new Error("[PluginException] Plugin with identifier " + identifier + " has no public iface");
            }
        } else {
            log('Plugins', new Error("[PluginException] Could not get public iface of unregistered plugin with identifier " + identifier), 'err');
        }
    };

    init(cb) {
        db.findToArray(_c.default(), 'plugins', {
            'active': true
        }, (err, results) => {
            let i = -1;
            const nextPlugin = () => {
                if (++i == results.length) {
                    cb && cb();
                } else {
                    this.registerPlugin(results[i].identifier, () => {nextPlugin()});
                }
            }

            nextPlugin();
        });
    };
};

module.exports = new Plugins;
