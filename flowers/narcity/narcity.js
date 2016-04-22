var endpoints = undefined;
var livevars = undefined;
var filelogic = undefined;
var cli = undefined;
var imageSize = undefined;
var articleHelper = undefined;

var themePath;

// TODO : Receive context site
var NarcityTheme = function () {
    var initLivevars = function() {

    };
}

var initRequires = function(abspath) {
    endpoints = require(abspath + 'endpoints.js');
    filelogic = require(abspath + 'filelogic.js');
    livevars = require(abspath + 'livevars.js');
    templateBuilder = require(abspath + 'templateBuilder.js');
    cli = require(abspath + 'cli.js');
    imageSize = require(abspath + 'imageSize.js');
    articleHelper = require(abspath + 'articleHelper.js');
};

var registerPictureSizes = function() {
    if (!imageSize.exists("thumbnail-small")) {
        imageSize.add("thumbnail-small", 308, 150);
    }

    if (!imageSize.exists("thumbnail-large")) {
        imageSize.add("thumbnail-large", 638, 340);
    }

    if (!imageSize.exists("thumbnail-medium")) {
        imageSize.add("thumbnail-medium", 638, 340);
    }
};

var loadHooks = function(_c, info) {
    endpoints.register(_c.id, '', 'GET', function(cli) {
        articleHelper.getHomepageArticles(cli, function(extra) {
            filelogic.serveAbsoluteLml(themePath + '/homepage.lml', _c.server.html + '/index.html', cli, extra)

        });
    });
};

var registerPrecompFiles = function(_c) {

    // templateBuilder.addJS(path + '/precomp/js/');
    templateBuilder.addCSS(themePath + '/precomp/css/fonts.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/style.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/CoverPop.css.lml', _c.id);
}

NarcityTheme.prototype.enable = function (_c, info, callback) {
    themePath = _c.server.base + _c.paths.themes + '/' + info.uName;

    initRequires(_c.server.base);
    loadHooks(_c);
    registerPrecompFiles(_c);
    registerPictureSizes();
    // Symlink res to html folder
    cli.createSymlink(themePath + '/res', _c.server.html + '/res', callback())
}

NarcityTheme.prototype.disable = function (callback) {
    return callback();
}

module.exports = new NarcityTheme();
