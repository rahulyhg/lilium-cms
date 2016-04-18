var themes = require('./themes.js');
var lmllib = require('./lmllib.js');
var petalsManager = require('./petal.js');
var Frontend = require('./frontend.js');
var hooks = require('./hooks.js');
var log = require('./log.js');

var templateBuilder = function () {
    var that = this;
    var settings = {};
    var petals = {};
    var css = [];
    var js = [];

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
            log("Template", "Exception while loading a template that does not exist : " + templateName);
            // return '<p class="theme-errorstrip">[TemplateException] Template with name <b>"' + templateName + '"</b> does not exists.<p>'
            return '';
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

    this.registerRoute = function (route, lmltemplate) {

    };

    var registerHooks = function (config) {
        // Hook on plugins loaded
        (function(config) {
            hooks.bind('init', 1, function () {
                that.precompThemeFiles(config);
            });
        })(config);
    };

    this.init = function (config) {
        log('TemplateBuilder', "Initializing for site " + config.id);
        settings = themes.getEnabledTheme(config);

        lmllib.registerContextLibrary('theme', function () {
            return {
                render: renderBlock,
                settings: getSettings()
            };
        });

        log('TemplateBuilder', "Registering theme hooks");
        registerHooks(config);
        log('TemplateBuilder', "Done initializing site " + config.id);
    };


    this.registerJSFile = function (absPath) {
        css.push(absPath);
    };

    this.registerCSSFile = function (absPath) {
        css.push(absPath);
    };

    this.precompThemeFiles = function (_c) {
        var paths = '';
        for (var i in css) {
            Frontend.registerJSFile(css[i].substring(0, css[i].lastIndexOf('.')), 150, "theme", _c.id);
        }

        for (var i in js) {
            Frontend.registerCSSFile(js[i].substring(0, js[i].lastIndexOf('.')), 150, "theme", _c.id);
        }

        require('./precomp.js').precompile(_c, function () {

        }, css.concat(js));
    };

};


module.exports = new templateBuilder();
