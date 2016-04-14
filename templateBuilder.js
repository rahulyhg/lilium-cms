var themes = require('./themes.js');
var lmllib = require('./lmllib.js');
var petalsManager = require('./petal.js');

var templateBuilder = function () {
        var settings = {};
        var petals = {};

        var renderBlock = function (templateName) {
            if (petals[templateName]) {
                for (var i in petals[templateName]) {
                    var extra = petals[templateName][i].extra;
                    var id = petals[templateName][i].id;

                    extra.settings = themes.getSettings();

                    petalsManager.compile(id, function (html) {
                        return html;
                    }, extra);
                }
            } else {
                return '[Template Error] Template with name "' + templateName + '" does not exists.<br>'
            }
        };

        var getSettings = function () {
            return settings.settings;
        }


        this.registerPetal = function (sectionName, absPetalPath, priority, extra) {
            var registerFilename = __caller;
            pluginHelper.getPluginIdentifierFromFilename(registerFilename, function (pluginIdentifier) {

                    if (typeof petals[sectionName] === 'undefined') {
                        petals[sectionName] = {};
                    }

                    var switchedPrio = false;
                    if (petals[sectionName][priority]) {
                        log("Template", "Tried to register petal with existing priority : " + sectionName + "@" + priority);
                        switchedPrio = true;
                    }

                    while (events[sectionName][priority]) {
                        priority++;
                    }

                    if (switchedPrio) {
                        log("Hooks", "Modified priority to " + priority);
                    }

                    petals[sectionName][priority] = {
                        petal: absPetalPath,
                        extra: extra,
                        plugin: pluginIdentifier
                    };

                });
            };

            this.registerRoute = function(route, lmltemplate) {

            };

            var registerHooks = function() {

            };

            this.init = function () {
                settings = themes.getEnabledTheme();

                lmllib.registerContextLibrary('theme', function () {
                    return {
                        render: renderBlock,
                        settings: getSettings()
                    };
                });

                registerHooks();
            };

        };

module.exports = new templateBuilder();
