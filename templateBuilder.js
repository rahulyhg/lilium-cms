var themes = require('./themes.js');
var lmllib = require('./lmllib.js');
var petalsManager = require('./petal.js');
var Frontend = require('./frontend.js');
var hooks = require('./hooks.js');
var log = require('./log.js');
var _c = require('./config.js');

var siteextra = {};

var templateBuilder = function () {
    var that = this;
    var settings = {};
    var petals = {};
    var css = {};
    var js = {};

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

    var getSettings = function (config) {
        return themes.getEnabledTheme(config).settings;
    };

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

    var getQueueTags = function(config) {
        var string = "";
        var queue =  require('./precomp.js').getSiteQueue(config);

        if (queue) {
            queue.forEach(function(tag) {
                switch (tag.type) {
                    case 'css':
                        string += '<link rel="stylesheet" type="text/css" href="'+tag.src+'" />\n';
                        break;
                    case 'js':
                        string += '<script src="'+tag.src+'"></script>\n'
                        break;
                    default:
                        string += '';
                        break;
                }
            });
        }

        return string;
    };

    this.init = function (config) {
        log('TemplateBuilder', "Initializing for site " + config.id);
    
        (function(gconf) {
            themes.fetchCurrentTheme(gconf, function(enabledTheme) {
                lmllib.registerContextLibrary('theme', function (context) {
                    var rendersnip = function(snipid, _____) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        return themes.renderSnip(gconf, snipid, args);
                    };
    
                    return {
                        render: renderBlock,
                        settings: context.extra.theme.settings,
                        info : context.extra.theme,
                        snip : rendersnip,
                        getQueueTags : function() {return getQueueTags(gconf);}
                    };
                });
            });
        })(config);

        log('TemplateBuilder', "Done initializing site " + config.id);
    };


    this.addJS = function (absPath, siteID) {
        js[siteID] = js[siteID] ? js[siteID] : [];
        js[siteID].push(absPath);
    };

    this.addCSS = function (absPath, siteID) {
        css[siteID] = css[siteID] ? css[siteID] : [];
        css[siteID].push(absPath);
    };

    this.addExtra = function(siteid, key, value) {
        if (!siteextra[siteid]) {
            siteextra[siteid] = {};
        }

        siteextra[siteid][key] = value;
    };

    this.precompAllFiles = function () {
        var sites = _c.getAllSites();
        for (var i in sites) {
            this.precompThemeFiles(sites[i], function() {});
        }
    };

    this.precompThemeFiles = function (_c, cb, force) {
        that.precompJS(_c);
        that.precompCSS(_c);

        var fileArr = new Array();
        if (js[_c.id]) for (var i = 0; i < js[_c.id].length; i++) {
            fileArr.push(js[_c.id][i]);
        }
        if (css[_c.id]) for (var i = 0; i < css[_c.id].length; i++) {
            fileArr.push(css[_c.id][i]);
        }

        require('./precomp.js').precompile(_c, cb, fileArr, force, siteextra[_c.id]);
    };

    this.precompJS = function (_c) {
        if (js[_c.id]) {
            for (var i in js[_c.id]) {
                var completePath = _c.server.html + '/compiled/theme' +js[_c.id][i].substring(js[_c.id][i].lastIndexOf('/'), js[_c.id][i].length);
                completePath = completePath.substring(0, completePath.lastIndexOf('.'));

                Frontend.registerJSFile(completePath, 150, "theme", _c.id);
                log('TemplateBuilder', 'Registered precomp JS File :' + js[_c.id][i]);
            }
        }
    }

    this.precompCSS = function (_c, cb) {
        if (css[_c.id]) {
            for (var i in css[_c.id]) {
                var completePath = _c.server.html + '/compiled/theme' +css[_c.id][i].substring(css[_c.id][i].lastIndexOf('/'), css[_c.id][i].length);
                completePath = completePath.substring(0, completePath.lastIndexOf('.'));
                Frontend.registerCSSFile(completePath, 150, "theme", _c.id);
                log('TemplateBuilder', 'Registered precomp CSS File :' + css[_c.id][i]);
            }
        }
    }

};


module.exports = new templateBuilder();
