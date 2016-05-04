var endpoints = undefined;
var livevars = undefined;
var filelogic = undefined;
var cli = undefined;
var imageSize = undefined;
var articleHelper = undefined;
var log = undefined;
var fileserver = undefined;
var themes = undefined;
var db = undefined;

var themePath;

// TODO : Receive context site
var NarcityTheme = function () {
    var initLivevars = function() {

    };
}

var initRequires = function(abspath) {
    log = require(abspath + 'log.js');
    endpoints = require(abspath + 'endpoints.js');
    filelogic = require(abspath + 'filelogic.js');
    livevars = require(abspath + 'livevars.js');
    templateBuilder = require(abspath + 'templateBuilder.js');
    cli = require(abspath + 'cli.js');
    imageSize = require(abspath + 'imageSize.js');
    articleHelper = require(abspath + 'articleHelper.js');
    fileserver = require(abspath + 'fileserver.js');
    themes = require(abspath + 'themes.js');
    db = require(abspath + 'includes/db.js');
};

var registerPictureSizes = function() {
    if (!imageSize.exists("thumbnailsmall")) {
        imageSize.add("thumbnailsmall", 308, 150);
    }

    if (!imageSize.exists("thumbnaillarge")) {
        imageSize.add("thumbnaillarge", 638, 340);
    }

    if (!imageSize.exists("thumbnailmedium")) {
        imageSize.add("thumbnailmedium", 638, 340);
    }

    if (!imageSize.exists("narcityfeatured")) {
        imageSize.add("narcityfeatured", 970, 400);
    }
};

var registerSnips = function(_c, cb) {
    fileserver.readFile(themePath + '/snips/bannerads.html', function(banhtml) {
        themes.registerThemeSnip(_c, 'bannerad', function(formats, dfpid, dims, htmlid) {
            return banhtml
                .replace('{1}', JSON.stringify(formats))
                .replace('{2}', htmlid.replace(/\-/g, '_'))
                .replace('{3}', dfpid)
                .replace('{4}', JSON.stringify(dims))
                .replace(/\{5\}/g, htmlid);
        });

        cb();
    });
};

var fetchHomepageArticles = function(_c, cb) {
    var sett = themes.getEnabledTheme(_c).settings;
    var homepageSections = sett.homepagesections;
    var i = 0;
    var len = Object.keys(homepageSections).length;
    var sectionArr = new Array();

    var nextSection = function() {
        if (i < len) {
            var csec = homepageSections[i];
            db.join(_c, 'content', [
                {
                    $match : {
                        'categories' : csec.catname,
                        'status' : 'published'
                    } 
                }, {
                    $limit : 3
                }, {
                    $lookup : {
                        from:           "uploads",
                        localField:     "media",
                        foreignField:   "_id",
                        as:             "featuredimage"
                    }
                }
            ], function(arr) {
                sectionArr.push({
                    "catname" : csec.catname,
                    "cattitle" : csec.cattitle,
                    "articles" : arr
                });

                i++;
                nextSection();
            });
        } else {
            db.join(_c, 'content', [
                {
                    $sort : {
                        date : -1
                    }
                }, {
                    $limit : 9
                }, {
                    $lookup : {
                        from:           "uploads",
                        localField:     "media",
                        foreignField:   "_id",
                        as:             "featuredimage"
                    }
                }
            ], function(latests) {
                cb({
                    sections : sectionArr,
                    latests : latests
                });
            });
        }
    };

    nextSection();
};

var loadHooks = function(_c, info) {
    endpoints.register(_c.id, '', 'GET', function(cli) {
        fetchHomepageArticles(_c, function(articles) {
            var extra = new Object();
            extra.sections = articles.sections;
            extra.latests = articles.latests;
            filelogic.renderThemeLML(cli, 'home', 'index.html', extra, function() {
                fileserver.pipeFileToClient(cli, _c.server.html + '/index.html', function() {
                    log('Narcity', 'Recreated and served homepage');
                }, true);
            });
        });
    });
};

var registerPrecompFiles = function(_c) {
    // templateBuilder.addJS(path + '/precomp/js/');
    templateBuilder.addCSS(themePath + '/precomp/css/fonts.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/style.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/CoverPop.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/ads.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/narcity.css.lml', _c.id);

    templateBuilder.addJS(themePath + '/precomp/js/vaniryk.js.lml', _c.id);
    templateBuilder.addJS(themePath + '/precomp/js/facebook.js.lml', _c.id);
    templateBuilder.addJS(themePath + '/precomp/js/global.js.lml', _c.id);
}

NarcityTheme.prototype.enable = function (_c, info, callback) {
    themePath = _c.server.base + _c.paths.themes + '/' + info.uName;

    initRequires(_c.server.base);
    log('Narcity', 'Required core files');

    loadHooks(_c);
    log('Narcity', 'Loaded hooks');

    registerPrecompFiles(_c);
    log('Narcity', 'Registered files for precompilation');

    registerPictureSizes();
    log('Narcity', 'Registered custom image sizes');

    registerSnips(_c, function() {
        log('Narcity', 'Registered theme snips');

        // Symlink res to html folder
        fileserver.createSymlink(themePath + '/res', _c.server.html + '/res', function() {
            log('Narcity', 'Created symlink. Ready to callback');
            callback();
        });
    });
}

NarcityTheme.prototype.disable = function (callback) {
    return callback();
}

module.exports = new NarcityTheme();
