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
var entities = undefined;
var LML2 = undefined;
var Article = undefined;
var Category = undefined;

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
    entities = require(abspath + 'entities.js');
    LML2 = require(abspath + 'lml/compiler.js');
    cc = require(abspath + "config.js");
    Article = require(abspath + "article.js");
    Category = require(abspath + "category.js");
};

var registerPictureSizes = function() {
    if (!imageSize.exists("thumbnaillarge")) {
        imageSize.add("thumbnaillarge", 638, 340);
    }

    if (!imageSize.exists("narcityfeatured")) {
        imageSize.add("narcityfeatured", 970, 400);
    }

    if (!imageSize.exists("thumbnailarchive")) {
        imageSize.add("thumbnailarchive", 380, 200);
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
    var len = Object.keys(homepageSections || {}).length;
    var sectionArr = new Array();
    var authors = {};

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
                    $sort : {
                        date : -1
                    }
                }, {
                    $limit : 6
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

                for (var j = 0; j < arr.length; j++) {
                    arr[j].author = authors[arr[j].author];
                }

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
                    $limit : 12
                }, {
                    $lookup : {
                        from:           "uploads",
                        localField:     "media",
                        foreignField:   "_id",
                        as:             "featuredimage"
                    }
                }
            ], function(latests) {
                for (var j = 0; j < latests.length; j++) {
                    latests[j].author = authors[latests[j].author];
                }

                cb({
                    sections : sectionArr,
                    latests : latests
                });
            });
        }
    };

    db.findToArray(cc.default(), "entities", {}, function(err, arr) {
        for (var i = 0; i < arr.length; i++) {
            authors[arr[i]._id] = arr[i];
        }

        nextSection();
    }, {displayname : 1, avatarURL : 1, slug : 1});
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
        case 'latests':
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
            var indices = {pagenumbers : []};
        
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
                indices.pagenumbers.push(i);
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

var serveFeed = function(cli) {
    fileserver.fileExists(cli._c.server.html + "/feed.rss", function(ex) {
        if (ex) {
            fileserver.pipeFileToClient(cli, cli._c.server.html + "/feed.rss", function() {}, true, 'application/rss+xml');
        } else {
            db.find(cli._c, 'content', {status : "published"}, [], function(err, cur) {
                cur.project({date : 1, _id : 1}).sort({date : -1}).limit(10).toArray(function(err, arr) {
                    var extra = {
                        config : cli._c, 
                        minify : false, 
                        articles : []
                    };
    
                    var index = 0;

                    var getNext = function() {
                        if (index == arr.length) {
                            compile();
                        } else {
                            Article.deepFetch(cli._c, db.mongoID(arr[index]._id), function(fullart) {
                                index ++;
                                extra.articles.push(fullart);
                                getNext();
                            });
                        }
                    };

                    var compile = function() {
                        LML2.compileToFile(cli._c.server.base + "/flowers/narcity/feed.lml", cli._c.server.html + "/feed.rss", function() {
                            log('RSS', 'Generated cached RSS feed for 1 hour');
                            fileserver.pipeFileToClient(cli, cli._c.server.html + "/feed.rss", function() {}, true, 'application/rss+xml');
        
                            setTimeout(function() {
                                fileserver.deleteFile(cli._c.server.html + "/feed.rss", function() {
                                    log("RSS", "Deleted cached RSS", 'info');
                                });
                            }, 1000 * 60 * 60);
                        }, extra);
                    };

                    getNext();
                });
            });
        }
    });
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

    if (archType === "latests") {
        tagName = "latests";
        tagIndex = cli.routeinfo.path[1] || 1;
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

    var file = _c.server.html + '/' + archType + '/' + tagName + '/' + tagIndex + "/index.html";
    fileserver.fileExists(file, function(exists) { 
        if (!exists || typeof cachedTags[archType][tagName][tagIndex] === 'undefined') {
            fetchArchiveArticles(_c, archType, tagName, parseInt(tagIndex) - 1, function(archDetails, articles, total, indices) {
                if (typeof archDetails === "number") {
                    return cli.throwHTTP(404, 'NOT FOUND');
                }

                var extra = new Object();
                extra.articles = articles;
                extra.totalarticles = total;
                extra.searchname = tagName || archType;
                extra.indices = indices;
                extra.currentpage = tagIndex;
                extra.archivename = archType;
                extra.archivedetails = archDetails;
                
                filelogic.renderThemeLML(cli, archType, archType + "/" + tagName + '/' + tagIndex + '/index.html', extra, function() {
                    fileserver.pipeFileToClient(cli, file, function() {
                        cachedTags[archType][tagName][tagIndex] = true;
                        log('Narcity', 'Generated tag archive for type ' + archType + ' : ' + tagName);
                    });
                });
            });
        } else {
            fileserver.pipeFileToClient(cli, file, noOp, true);
        }
    });
}

var objToURIParams = function(params) {
    if (!Object.keys(params).length) return "";

    var str = "?";
    for (var key in params) {
        str += key + "=" + params[key] + "&";
    }

    return str;
};

var generateHomepage = function(_c, cb) {
    fetchHomepageArticles(_c, function(articles) {
        var extra = new Object();
        extra.sections = articles.sections;
        extra.latests = articles.latests;

        filelogic.renderThemeLML(_c, 'home', 'index.html', extra, function() {
            cb && cb();
        });
    });
}

var getWhatsHot = function(_c, cb) {
    var toppagesURL = "http://api.chartbeat.com/live/toppages/v3/?apikey="+
        _c.chartbeat.api_key + "&host="+
        _c.chartbeat.host + "&section="+
        _c.chartbeat.section + "&types=1";

    log('Narcity', 'Requesting popular pages');
    require('request').get(toppagesURL, {}, function(err, resp, body) {
        var pages = [];
        try {
            var respobj = JSON.parse(body);
            for (var i = 0; i < 12 && i < respobj.pages.length; i++) {
                var split = respobj.pages[i].path.split('/');
                pages.push(split[split.length - 2]);
            }

            var index = 0;
            var articleArray = [];
        
            log('Narcity', 'Deep fetching ' + pages.length + ' articles');
            var nextURL = function() {
                if (index == pages.length) {
                    cb(articleArray);
                } else {
                    Article.deepFetch(_c, pages[index], function(article) {
                        
                        if (article) {
                            articleArray.push({
                                _id : article._id, 
                                fullurl : _c.server.url + "/" + article.name,
                                featuredimage : article.featuredimage[0].sizes.thumbnaillarge.url,
                                authorname : article.authors[0].displayname,
                                authorpage : _c.server.url + "/author/" + article.authors[0].slug,
                                authorface : article.authors[0].avatarURL,
                                date : article.date, 
                                category : Category.getCatName(_c, article.categories[0]),
                                categorylink : _c.server.url + "/category/" + article.categories[0],
                                sponsored : article.isSponsored
                            });
                        }

                        index++;
                        nextURL();
                    });
                }
            };
            nextURL();

        } catch (ex) {
            log('Narcity', 'Failed because of ' + ex, 'warn');
            cb([]);
        }
    }); 
}

var needsHomeRefresh = true;
var cachedTags = {};
var loadHooks = function(_c, info) {
    endpoints.register(_c.id, ["2012", "2013", "2014", "2015", "2016", "2017"], 'GET', function(cli) {
        cli.redirect(_c.server.url + "/" + cli.routeinfo.path.pop() + (Object.keys(cli.routeinfo.params) ? objToURIParams(cli.routeinfo.params) : ""));
    });

    endpoints.register(_c.id, 'tag', 'GET', function(cli) {
        cli.redirect(_c.server.url + '/tags/' + cli.routeinfo.path[1] + (Object.keys(cli.routeinfo.params) ? objToURIParams(cli.routeinfo.params) : ""));
    });

    endpoints.register(_c.id, '', 'GET', function(cli) {
        fileserver.fileExists(_c.server.html + "/index.html", function(exists) {
            if (needsHomeRefresh || !exists) {
                generateHomepage(cli._c, function() {
                    fileserver.pipeFileToClient(cli, _c.server.html + '/index.html', function() {
                        needsHomeRefresh = false;
                        log('Narcity', 'Recreated and served homepage');
                    }, true);
                });
            } else {
                fileserver.pipeFileToClient(cli, _c.server.html + '/index.html', noOp, true);
            }
        });
    });

    var cachedHot = [];
    var hotRefreshNeeded = true;
    endpoints.register(_c.id, 'whatshot', 'GET', function(cli) {
        if (hotRefreshNeeded) {
            getWhatsHot(cli._c, function(hotArr) {
                cachedHot = hotArr || [];
                cli.sendJSON(cachedHot);
            });

            setTimeout(function() {
                hotRefreshNeeded = true;
            }, 1000 * 60 * 5);
        } else {
            cli.sendJSON(cachedHot);
        }
    });

    ["tags", "author", "category", "search", "latests"].forEach(function(archType) {
        endpoints.register(_c.id, archType, 'GET', function(cli) { serveArchive(cli, archType); }); 
    });

    var backendFEscriptFirstRequest = false;
    endpoints.register(_c.id, 'lilium', 'GET', function(cli) {
        if (cli.userinfo.loggedin && entities.isAllowed(cli.userinfo, 'dash')) {
            var path = cli._c.server.base + "backend/static/gen/narcitylilium.js";
            fileserver.fileExists(path, function(exists) {
                if (exists && backendFEscriptFirstRequest) {
                    fileserver.pipeFileToClient(cli, path, noOp, true, "text/javascript");
                } else {
                    backendFEscriptFirstRequest = true;
                    LML2.compileToFile(cli._c.server.base + "/flowers/narcity/precomp/js/lilium.js.lml", path, function() {
                        fileserver.pipeFileToClient(cli, path, noOp, true, "text/javascript");
                    }, {config : cli._c, minify : true});
                }
            });
        } else {
            cli.throwHTTP(204, "", true);
        }
    });

    var backendFEstyleFirstRequest = false;
    endpoints.register(_c.id, 'liliumstyle', 'GET', function(cli) {
        if (cli.userinfo.loggedin && entities.isAllowed(cli.userinfo, 'dash')) {
            var path = cli._c.server.base + "backend/static/gen/narcitylilium.css";
            fileserver.fileExists(path, function(exists) {
                if (exists && backendFEstyleFirstRequest) {
                    fileserver.pipeFileToClient(cli, path, noOp, true, "text/css");
                } else {
                    backendFEstyleFirstRequest = true;
                    LML2.compileToFile(cli._c.server.base + "/flowers/narcity/precomp/css/lilium.css.lml", path, function() {
                        fileserver.pipeFileToClient(cli, path, noOp, true, "text/css");
                    }, {config : cli._c, minify : false});
                }
            });
        } else {
            cli.throwHTTP(204, "", true);
        }
    });

    endpoints.register(_c.id, 'articlestats', 'GET', function(cli) {
        if (cli.userinfo.loggedin && entities.isAllowed(cli.userinfo, 'dash')) {
            var articleid = cli.routeinfo.path[1];
            if (articleid) {
                articleid = db.mongoID(articleid);
                Article.deepFetch(cli._c, articleid, function(da) {
                    var extra = {
                        article : da, 
                        config : cli._c, 
                        user : cli.userinfo,
                        context : cli.routeinfo.params.context
                    };

                    var path = cli._c.server.base + "flowers/narcity/precomp/lml/slider.lml";
                    fileserver.readFile(path, function(lmlcontent) {
                        LML2.compile(cli._c.id, lmlcontent, cli.response, extra, function() {
                            cli.response.end();
                        });
                    }, false, 'utf8');
                });
            } else {
                cli.throwHTTP(204, "", true);
            }
        } else {
            cli.throwHTTP(204, "", true);
        }
    });

    var cachedStats = {};
    var chartbeaturl = "http://api.chartbeat.com/live/quickstats/v4/?apikey=[key]&host=[host]&path=";
    endpoints.register(_c.id, 'chartbeatbridge', 'GET', function(cli) {
        if (cli.userinfo.loggedin && entities.isAllowed(cli.userinfo, 'dash') && cli._c.chartbeat && cli._c.chartbeat.api_key) {
            var requrl = chartbeaturl.replace('[key]', cli._c.chartbeat.api_key).replace('[host]', cli._c.chartbeat.host) +
                cli.routeinfo.params.url + 
                (cli._c.chartbeat.section ? "&section=" + cli._c.chartbeat.section : "");
            
            if (cachedStats[requrl] && new Date() - cachedStats[requrl].at < 5000) {
                cli.sendJSON(cachedStats[requrl].body);
            } else {
                require('request')(requrl, function(err, resp, bod) {
                    cachedStats[requrl] = {
                        body : bod,
                        at : new Date()
                    };
    
                    cli.sendJSON(bod);
                });
            }
        } else {
            cli.throwHTTP(204, "", true);
        }
    });

    fileserver.deleteFile(_c.server.html + "/feed.rss", function() {
        endpoints.register(_c.id, 'feed', 'GET', function(cli) {
            serveFeed(cli);
        });
    });

    hooks.bind('homepage_needs_refresh', 1, function(pkg) { 
        generateHomepage(pkg._c || pkg.cli._c);
    });

    hooks.bind('article_will_create', 2000, function(pkg) { articleChanged(pkg.cli, pkg.article); });
    hooks.bind('article_will_edit',   2000, function(pkg) { articleChanged(pkg.cli, pkg.article); });
    hooks.bind('article_will_delete', 2000, function(pkg) { articleChanged(pkg.cli, pkg.article); });
    hooks.bind('article_will_render', 2000, function(pkg) { 
        // Fix fields
        parseArticleFields(pkg);

        // Replace ad tags with ad set
        parseAds(pkg); 

        // Replace Instagram scripts
        parseInsta(pkg);

        // Flag if NSFW, ad it to deepfetched object
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

var parseArticleFields = function(pkg) {
    var art = pkg.article;
    art.tags = art.tags || [];
    art.title = art.title || "";
    art.subtitle = art.subtitle || "";
    art.categories = art.categories || [{name : "uncategorized", displayname : ""}];
}

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
