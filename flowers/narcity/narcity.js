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
var hooks = undefined;
var lmllib = undefined;
var cc = undefined;

var themePath;
var noOp = function() {};

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
    hooks = require(abspath + 'hooks.js');
    db = require(abspath + 'includes/db.js');
    lmllib = require(abspath + 'lmllib.js');
    cc = require(abspath + "config.js");
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
                    $match : {
                        'status' : 'published'
                    } 
                }, {
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

var registerLib = function() {
    lmllib.registerContextLibrary('base64', function(context) {
        Base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}};

        return Base64;
    });
};

var articleChanged = function(cli, article) {

};

var fetchArchiveArticles = function(cli, section, mtc, skp, cb) {
    var match = {
        status : 'published'
    };

    var typeMatch = {};
    var typeCollection = "";

    switch (section) {
        case 'tags':
            match['tagslugs'] = mtc;
            typeCollection = "tags";
            typeMatch.name = mtc;
            break;
        case 'category':
            match['categories'] = mtc;
            typeCollection = "categories";
            typeMatch = [
                { 
                    $match : { name : mtc } 
                }
            ];
            break;
        case 'author':
            typeCollection = "entities";
            typeMatch = [
                {
                    $match : {
                        slug : mtc
                    }
                }
            ];
            break;
        case 'search':
            match["$text"] = {
                $search : mtc
            }
            break;      
        default:
            match['NONE'] = '$';
    }

    var limit = 18;
    var skip = skp * limit;
    var matchCallback = function(archTypeRes, err) { 
        if (err || archTypeRes.length == 0) {
            return cb(404);
        }

        if (section == 'author') {
            match["author"] = db.mongoID(archTypeRes[0]._id);
        }

        db.join(cli._c || cli, 'content', [
            {
                $match : match
            }, {
                $sort : {
                    _id : -1
                }
            }, {
                $lookup : {
                    from:           "uploads",
                    localField:     "media",
                    foreignField:   "_id",
                    as:             "featuredimage"
                }
            }
        ], function(latests) {
            var totalArticles = latests.length;
            var totalPages = Math.ceil(latests.length / limit);
            var smallest = 1;
            var highest = totalPages;
            var indices = [];
        
            if (totalPages > 5) {
                var cPage = parseInt(skp);
                if (totalPages - cPage < 3) {
                    smallest = highest - 5;
                } else if (cPage < 4) {
                    highest = 5;
                } else {
                    highest = cPage + 2;
                    smallest = cPage - 2;
                }
            }

            for (var i = smallest; i <= highest; i++) {
                indices.push(i);
            }

            indices.totalpages = totalPages;
            indices.totalarticles = totalArticles;

            cb(err || archTypeRes[0], latests.splice(skip, limit), totalArticles, indices);
        });
    }

    if (section == "tags" || section == "search") {
        matchCallback([{tag : mtc}]);
    } else {
        db.join(typeCollection == "entities" ? cc.default() : cli._c || cli, typeCollection, typeMatch, matchCallback);
    }
};

var serveArchive = function(cli, archType) {
        var _c = cli._c;
        var tagName = cli.routeinfo.path[1];
        var tagIndex = cli.routeinfo.path[2] || 1;

        if (archType === "search" && !tagName) {
            tagName = cli.routeinfo.params.q;
            if (!tagName || tagName == "") {
                return cli.throwHTTP(404, 'NOT FOUND');
            }
        }

        if (isNaN(tagIndex)) {
            return cli.throwHTTP(404, 'NOT FOUND');
        }

        if (typeof cachedTags[archType] === 'undefined') {
            cachedTags[archType] = {};
        }

        if (typeof cachedTags[archType][tagName] === 'undefined') {
            cachedTags[archType][tagName] = [];
        }

        if (typeof cachedTags[archType][tagName][tagIndex] === 'undefined') {
            fetchArchiveArticles(_c, archType, tagName, parseInt(tagIndex) - 1, function(archDetails, articles, total, indices) {
                if (typeof archDetails === "number") {
                    return cli.throwHTTP(404, 'NOT FOUND');
                }

                var extra = new Object();
                extra.articles = articles;
                extra.totalarticles = total;
                extra.searchname = tagName;
                extra.indices = indices;
                extra.currentpage = tagIndex;
                extra.archivename = archType;
                extra.archivedetails = archDetails;
                
                filelogic.renderThemeLML(cli, archType, archType + "/" + tagName + '/' + tagIndex + '/index.html', extra, function() {
                    fileserver.pipeFileToClient(cli, _c.server.html + '/' + archType +'/' + tagName + '/' + tagIndex + '/index.html', function() {
                        cachedTags[archType][tagName][tagIndex] = true;
                        log('Narcity', 'Generated tag archive for type ' + archType + ' : ' + tagName);
                    });
                });
            });
        } else {
            fileserver.pipeFileToClient(cli, _c.server.html + '/' + archType + '/' + tagName + '/' + tagIndex + "/index.html", noOp, true);
        }

}

var needsHomeRefresh = true;
var cachedTags = {};
var loadHooks = function(_c, info) {
    endpoints.register(_c.id, ["2012", "2013", "2014", "2015", "2016", "2017"], 'GET', function(cli) {
        cli.redirect(_c.server.url + "/" + cli.routeinfo.path.pop());
    });

    endpoints.register(_c.id, '', 'GET', function(cli) {
        if (needsHomeRefresh) {
            fetchHomepageArticles(_c, function(articles) {
                var extra = new Object();
                extra.sections = articles.sections;
                extra.latests = articles.latests;
    
                filelogic.renderThemeLML(cli, 'home', 'index.html', extra, function() {
                    fileserver.pipeFileToClient(cli, _c.server.html + '/index.html', function() {
                        needsHomeRefresh = false;
                        log('Narcity', 'Recreated and served homepage');
                    }, true);
                });
            });

            setTimeout(function() {
                needsHomeRefresh = true;
            }, 1000 * 60 * 5);
        } else {
            fileserver.pipeFileToClient(cli, _c.server.html + '/index.html', noOp, true);
        }
    });

    ["tags", "author", "category", "search"].forEach(function(archType) {
        endpoints.register(_c.id, archType, 'GET', function(cli) { serveArchive(cli, archType); }); 
    });

    hooks.bind('article_will_create', 2000, function(pkg) { articleChanged(pkg.cli, pkg.article); });
    hooks.bind('article_will_edit',   2000, function(pkg) { articleChanged(pkg.cli, pkg.article); });
    hooks.bind('article_will_delete', 2000, function(pkg) { articleChanged(pkg.cli, pkg.article); });
    hooks.bind('article_will_render', 2000, function(pkg) { 
        parseAds(pkg); 
        parseInsta(pkg);
        parseNSFW(pkg);
    });
};

NarcityTheme.prototype.clearCache = function(ctx, detail) {
    switch (ctx) {
        case "home": needsHomeRefresh = true; break;
        case "tags": delete cachedTags[ctx][detail]; break;
        default: break;
    }
};

var parseNSFW = function(pkg) {
    pkg.article.nsfw = typeof pkg.article.tags == "object" && pkg.article.tags.indexOf && (pkg.article.tags.indexOf("nsfw") !== -1 || pkg.article.tags.indexOf("NSFW") !== -1);
};

var parseInsta = function(pkg) {
    pkg.article.content = pkg.article.content.replace(/\<script async\=\"\" defer\=\"\" src\=\"\/\/platform.instagram.com\/en_US\/embeds.js\"\>\<\/script\>/g, "") + '<script async="" defer="" src="//platform.instagram.com/en_US/embeds.js"></script>';
};

var parseAds = function(pkg) {
    if (!pkg._c.contentadsnip) {
        return;
    }

    var art = pkg.article;
    var keys = Object.keys(pkg._c.contentadsnip);
    var indx = 0;
    var delimiter = "<ad></ad>";    
    var pos;
    
    if (art.tags.indexOf('nsfw') == -1 && art.tags.indexOf('NSFW') == -1) {
        while ((pos = art.content.indexOf(delimiter)) != -1) {
            art.content = art.content.substring(0, pos) + '<div class="awrapper">' + pkg._c.contentadsnip[keys[indx]].code + "</div>" + art.content.substring(pos+delimiter.length);
            indx++;

            if (indx == keys.length) {
                break;
                indx = 0;
            }
        }
    }

    art.content = art.content.replace(/\<ad\>\<\/ad\>/g, "");
};

var registerPrecompFiles = function(_c) {
    // templateBuilder.addJS(path + '/precomp/js/');
    templateBuilder.addCSS(themePath + '/precomp/css/fonts.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/style.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/CoverPop.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/ads.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/ckeditor.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/narcity.css.lml', _c.id);

    templateBuilder.addJS(themePath + '/precomp/js/vaniryk.js.lml', _c.id);
    templateBuilder.addJS(themePath + '/precomp/js/social.js.lml', _c.id);
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

    registerLib();
    log('Narcity', 'Registered LML Library');

    registerSnips(_c, function() {
        log('Narcity', 'Registered theme snips');

        // Symlink res to html folder
        fileserver.createSymlink(themePath + '/res', _c.server.html + '/res', function() {
            fileserver.createDirIfNotExists(_c.server.html + "/tags", function() {
                fileserver.createDirIfNotExists(_c.server.html + "/authors", function() {
                    fileserver.createDirIfNotExists(_c.server.html + "/category", function() {
                        log('Narcity', 'Created symlink and content directories. Ready to callback');
                        callback();
                    }, true);
                }, true);
            }, true);
        });
    });
}

NarcityTheme.prototype.disable = function (callback) {
    return callback();
}

module.exports = new NarcityTheme();
