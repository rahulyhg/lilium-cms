var themes = require('./themes.js');
var lmllib = require('./lmllib.js');
var petals = require('./petal.js');

var templateBuilder = function () {
    var settings = {};
    var petals = {};

    var renderBlock = function (templateName) {
        if (petals[templateName]) {
            for (var i in petals[templateName]) {
                var extra = petals[templateName][i].extra;
                var id = petals[templateName][i].id;
                petals.compile(id, function(html) {
                    return html;
                }, extra);
            }
        } else {
            return '[Template Error] Template with name "'+ templateName +'" does not exists.<br>'
        }
    };

    var getSettings = function() {
        return settings.settings;
    }


    this.registerPetal = function (sectionName, petal ,priority) {

    };

    this.init = function() {
        settings = themes.getEnabledTheme();

        lmllib.registerContextLibrary('theme', function() {
            return {render : renderBlock, settings: getSettings()};
        });
    };

};

module.exports = new templateBuilder();
