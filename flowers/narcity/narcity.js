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
var topics = undefined;
var cc = undefined;
var entities = undefined;
var LML2 = undefined;
var Article = undefined;
var Category = undefined;
var sharedcache = undefined;
var API = undefined;

var readersLib = undefined;

var themePath;
var noOp = function() {};

var NarcityTheme = function () {}

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
    topics = require(abspath + "topics.js");
    hooks = require(abspath + 'hooks.js');
    db = require(abspath + 'includes/db.js');
    lmllib = require(abspath + 'lmllib.js');
    entities = require(abspath + 'entities.js');
    LML2 = require(abspath + 'lml/compiler.js');
    cc = require(abspath + "config.js");
    Article = require(abspath + "article.js");
    sharedcache = require(abspath + "sharedcache.js");
    API = require(abspath + "api.js");
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
    var sett = themes.getEnabledTheme(_c).settings || {};
    var homepageSections = sett.homepagesections;
    var i = 0;
    var len = Object.keys(homepageSections || {}).length;
    var sectionArr = new Array();
    var authors = {};
    var limit = sett.archivearticlecount ? parseInt(sett.archivearticlecount) : 12
    var sectionTopics = [];

    var nextSection = function() {
        if (i < len) {
            db.join(_c, 'content', [
                {
                    $match : {
                        'topic' : sectionTopics[i]._id,
                        'status' : 'published',
                        'nsfw' : {$ne : true}
                    } 
                }, {
                    $sort : {
                        date : -1
                    }
                }, {
                    $limit : 6 || limit
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
                    "topic" : sectionTopics[i],
                    "catname" : sectionTopics[i].completeSlug,
                    "cattitle" : sectionTopics[i].displayname,
                    "articles" : arr
                });

                for (var j = 0; j < arr.length; j++) {
                    arr[j].author = authors[arr[j].author];
                    arr[j].topic = sectionTopics[i];
                    arr[j].url = _c.server.protocol + _c.server.url + sectionTopics[i].completeSlug + "/" + arr[j].name;

                    arr[j].classes = "article-thumbnail";
                    if ((9 - j) % 9 == 0) {
                        arr[j].classes += " article-thumbnail-featured"
                    } else if ((j + 1) % 9 > 3) {
                        arr[j].classes += " article-thumbnail-margined"
                    }
                }

                i++;
                nextSection();
            });
        } else {
            db.join(_c, 'content', [
                {
                    $match : {
                        'status' : 'published',
                        'nsfw' : {$ne : true}
                    } 
                }, {
                    $sort : {
                        date : -1
                    }
                }, {
                    $limit : limit
                }, {
                    $lookup : {
                        from:           "uploads",
                        localField:     "media",
                        foreignField:   "_id",
                        as:             "featuredimage"
                    }
                }, {
                    $lookup : {
                        from:           "topics",
                        localField:     "topic",
                        foreignField:   "_id",
                        as:             "topic"
                    }
                }
            ], function(latests) {
                for (var j = 0; j < latests.length; j++) {
                    latests[j].author = authors[latests[j].author];
                    latests[j].topic = latests[j].topic[0];
                    latests[j].url = _c.server.protocol + _c.server.url + (latests[j].topic ? "/" + latests[j].topic.completeSlug : "") + "/" + latests[j].name;

                    latests[j].classes = "article-thumbnail";
                    if ((9 - j) % 9 == 0) {
                        latests[j].classes += " article-thumbnail-featured"
                    } else if ((j + 1) % 9 > 3) {
                        latests[j].classes += " article-thumbnail-margined"
                    }
                }

                cb({
                    sections : sectionArr,
                    latests : latests
                });
            });
        }
    };

    var cacheNextTopic = function(done) {
        var tIndex = 0;
        var next = function() {
            if (tIndex == len) {
                done();
            } else {
                db.findUnique(_c, 'topics', { completeSlug : homepageSections[i].catname }, function(err, topic) {
                    sectionTopics.push(topic);
                    tIndex++;
                    next();
                });
            }
        };

        next();
    }

    db.findToArray(cc.default(), "entities", {}, function(err, arr) {
        for (var i = 0; i < arr.length; i++) {
            authors[arr[i]._id] = arr[i];
        }
        
        cacheNextTopic(nextSection);
    }, {displayname : 1, avatarURL : 1, slug : 1});
};

var registerLib = function() {
    lmllib.registerContextLibrary('base64', function(context) {
        Base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){if (typeof e != "string") {return "";}var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){if (typeof e != "string") {return "";}var t="";var n,r,i;var s,o,u,a;var f=0;e=e&&e.replace?e.replace(/[^A-Za-z0-9+/=]/g,""):"";while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}};

        return Base64;
    });
};

var articleChanged = function(cli, article) {

};

var fetchArchiveArticles = function(cli, section, mtc, skp, cb) {
    var sett = themes.getEnabledTheme(cli._c || cli).settings || {};
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
        case 'topic':
            match.topic = cli.extra.topic._id;
        case 'latests':
            break;
        default:
            match['NONE'] = '$';
    }

    var limit = sett.archivearticlecount ? parseInt(sett.archivearticlecount) : 12
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
                    date : -1
                }
            }, {
                $lookup : {
                    from:           "uploads",
                    localField:     "media",
                    foreignField:   "_id",
                    as:             "featuredimage"
                }
            }, {
                $lookup : {
                    from:           "topics",
                    localField:     "topic",
                    foreignField:   "_id",
                    as:             "topic"
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

            var arrList = latests.splice(skip, limit);

            for (var i = 0; i < arrList.length; i++) {
                var topic = arrList[i].topic[0];
                arrList[i].topic = topic;
                arrList[i].url = cli._c.server.protocol + cli._c.server.url + (topic ? "/" + topic.completeSlug : "") + "/" + arrList[i].name;
            }

            cb(err || archTypeRes[0], arrList, totalArticles, indices);
        });
    }

    if (section == "tags" || section == "search") {
        matchCallback([{tag : mtc}]);
    } else if (section == "topic") {
        matchCallback([{topic : cli.extra.topic}]);
    } else {
        db.join(typeCollection == "entities" ? cc.default() : cli._c || cli, typeCollection, typeMatch, matchCallback);
    }
};

var generateRSS = function(_c, completeSlug, send) {
    var cpath = completeSlug;

    var conditions = {
        status : "published"
    };
    var rsspath = _c.server.html + "/feed.rss";
    var topicobj;
    var archpath = _c.server.protocol + _c.server.url;
    var feedpath = archpath + "/feed";

    var createFeed = function() {
        db.find(_c, 'content', conditions, [], function(err, cur) {
            cur.project({date : 1, _id : 1}).sort({date : -1}).limit(12).toArray(function(err, arr) {
                var extra = {
                    config : _c, 
                    minify : false, 
                    articles : [],
                    cpath : cpath,
                    archivepath : archpath,
                    feedpath : feedpath,
                    title : _c.website.sitetitle + (topicobj ? (" " + topicobj.displayname) : "")
                };

                var index = 0;

                var getNext = function() {
                    if (index == arr.length) {
                        compile();
                    } else {
                        Article.deepFetch(_c, db.mongoID(arr[index]._id), function(fullart) {
                            index ++;
                            extra.articles.push(fullart);
                            getNext();
                        });
                    }
                };

                var compile = function() {
                    LML2.compileToFile(_c.server.base + "flowers/narcity/feed.lml", rsspath, function() {
                        send(200);
                    }, extra);
                };

                getNext();
            });
        });
    };

    if (cpath) {
        rsspath = _c.server.html + "/" + cpath + "/feed.rss";
        db.findUnique(_c, 'topics', {completeSlug : cpath}, function(err, topic) {
            if (topic) {
                topics.getFamilyIDs(_c, topic._id, function(ids) {
                    topicobj = topic;
                    conditions.topic = {
                        "$in" : ids
                    };

                    archpath += "/" + cpath;
                    feedpath += "/" + cpath;
                    createFeed();
                });
            } else {
                log("RSS", "Requested feed for unexisting topic : " + cpath, "warn");
                send(404);
            }
        });
    } else {
        createFeed();
    }

};

var serveFeed = function(cli) {
    var cpath = cli.routeinfo.path.join('/');
    cpath = cpath.substring(5);

    var rsspath = cli._c.server.html + "/feed.rss";
    if (cpath) { 
        rsspath = cli._c.server.html + "/" + cpath + "/feed.rss";
    }

    fileserver.fileExists(rsspath, function(ex) {
        if (ex) {
            fileserver.pipeFileToClient(cli, rsspath, function() {}, true, 'application/rss+xml');
        } else {
            generateRSS(cli._c, cpath, function(code) {
                if (code && code == 404)  {
                    cli.throwHTTP(404, undefined, true);
                } else {
                    fileserver.pipeFileToClient(cli, rsspath, function() {}, true, 'application/rss+xml');
                }
            });
        }
    });
};

var fetchTopicArticles = function(conf, topic, index, send) {
    if (index != 0) {
        index--;
    }

    var sett = themes.getEnabledTheme(conf).settings || {};
    var limit = sett.archivearticlecount ? parseInt(sett.archivearticlecount) : 12
    var skip = index * limit;
    
    db.findToArray(cc.default(), 'entities', {}, function(err, entities) {
        var eCache = {};
        for (var i = 0; i < entities.length; i++) {
            eCache[entities[i]._id.toString()] = entities[i];
        }

        topics.getFamilyIDs(conf, topic._id, function(ids) {
            var match = {
                status : "published",
                topic : {$in : ids}
            }

            db.findToArray(conf, 'topics', {_id : {$in : ids}}, function(err, topicCache) {
                var topicObjects = {}
                topicCache.forEach(function(t) {
                    topicObjects[t._id] = t;
                });

                db.find(conf, 'content', match, [], function(err, cur) {
                    cur.count(function(err, total) {
                        db.join(conf, 'content', [
                            {
                                $match : match
                            }, {
                                $sort : {
                                    date : -1
                                }
                            }, {
                                $skip : skip
                            }, {
                                $limit : limit
                            }, {
                                $lookup : {
                                    from:           "uploads",
                                    localField:     "media",
                                    foreignField:   "_id",
                                    as:             "featuredimage"
                                }
                            }
                        ], function(arr) {
                            for (var i = 0; i < arr.length; i++) {
                                arr[i].author = eCache[arr[i].author && arr[i].author.toString()];
                                arr[i].topic = topicObjects[arr[i].topic];
                                arr[i].url = conf.server.protocol + conf.server.url + "/" + arr[i].topic.completeSlug + "/" + arr[i].name;

                                arr[i].classes = "article-thumbnail";
                                if ((9 - i) % 9 == 0) {
                                    arr[i].classes += " article-thumbnail-featured"
                                } else if ((i + 1) % 9 > 3) {
                                    arr[i].classes += " article-thumbnail-margined"
                                }
                            }

                            var details = {
                                totalLength : total,
                                totalPages : Math.ceil(total / limit),
                                pagenumbers : []
                            };

                            index ++;
                            if (index < 4) {
                                for (var i = 1; i <= details.totalPages && i <= 5; i++) {
                                    details.pagenumbers.push(i);
                                }
                            } else if (index > details.totalPages - 2) {
                                for (var i = details.totalPages - 4; i <= details.totalPages; i++) {
                                    details.pagenumbers.push(i);
                                }
                            } else {
                                var firstPage = index - 2;
                                var lastPage = index + 2;
                                for (var i = firstPage; i <= lastPage; i++) {
                                    details.pagenumbers.push(i);
                                }
                            }
                            

                            send(arr, details);
                        });
                    });
                });
            });
	    });
    });
};

var renderTopicArchive = function(_c, topic, index, done) {
    fetchTopicArticles(_c, topic, index, function(articles, details) {
        var xextra = {
            articles : articles,
            topic : topic,
            index : index || 1,
            searchname : topic.displayname,
            context : 'topic',
            language : topic.language,
            indices : {
                totalarticles : details.totalLength,
                totalpages : details.totalPages,
                pagenumbers : details.pagenumbers
            },
            currentpage : index || 1,
        };
        
        var context = xextra.currentpage != 1 ? "topic" : (topic.archivetemplate || "topic");
        var file = _c.server.html + "/" + topic.completeSlug + (index != 1 ? ("/" + index) : "") + ".html";

        filelogic.renderThemeLML(_c, context, file, xextra, function(content) {
            done && done(content);
        });
    });
}

var serveTopic = function(cli, extra) {
    var topic = extra.topic;
    var index = extra.index ? parseInt(extra.index) : 1;
    var file = cli._c.server.html + "/" + topic.completeSlug + (index != 1 ? ("/" + index) : "") + ".html";

    fileserver.fileExists(file, function(exists) {
        if (!exists) {
            renderTopicArchive(cli._c, topic, index, function(content) {
                cli.response.writeHead(200);
                cli.response.end(content);
                log('Narcity', 'Generated tag archive for topic ' + topic.displayname);
            });
        } else {
            fileserver.pipeFileToClient(cli, file, noOp, true);
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
            fetchArchiveArticles(cli, archType, tagName, parseInt(tagIndex) - 1, function(archDetails, articles, total, indices) {
                if (typeof archDetails === "number") {
                    return cli.throwHTTP(404, 'NOT FOUND');
                }

                var extra = {};
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

        filelogic.renderThemeLML(_c, 'home', 'index.html', extra, function(pContent) {
            var setObj = {};
            setObj["narcityhomepage_" + _c.id] = pContent
            sharedcache.set(setObj);

            cb && cb(pContent);
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
                var name = split.pop();
                if (!name) {
                    name = split.pop();
                }
                pages.push(name);

                log('Narcity', "Using What's Hot Article slug : " + pages[i]);
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
                                fullurl : article.url,
                                title : article.title, 
                                subtitle : article.subtitle,
                                featuredimage : article.featuredimage[0].sizes.thumbnaillarge.url,
                                authorname : article.authors[0].displayname,
                                authorpage : _c.server.url + "/author/" + article.authors[0].slug,
                                authorface : article.authors[0].avatarURL,
                                date : article.date, 
                                topic : article.topic,
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

var serveHomepageAPI = function(cli) {
    fetchHomepageArticles(cli._c, function(articles) { 
        articles = Article.toPresentables(cli._c, articles.latests);
        cli.sendJSON({
            section : "homepage", 
            articles
        });
    });
}

var serveReadAPI = function(cli) {
    var id = db.mongoID(cli.routeinfo.path[2]);
    if (id) {
        Article.deepFetch(cli._c, id, function(article) {
            if (article) {
                let splitIndex = 0;
                article = Article.toPresentable(cli._c, article);
                if (article.isPaginated) {
                    splitIndex = parseInt(cli.routeinfo.path[3] || 1) - 1;
                    article.content = article.content.split("<lml-page></lml-page>")[splitIndex];
                    article.currentPage = (splitIndex + 1);
                }

                cli.sendJSON({
                    section : "read",
                    article
                });
            } else {
                cli.throwHTTP(404, undefined, true);
            }
        }, false, {status : "published"});
    } else {
        cli.throwHTTP(404, undefined, true);
    }
};

var serveTopicAPI = function(cli) {
    var id = db.mongoID(cli.routeinfo.path[2]);
    if (cli.routeinfo.path.length > 2) {

    } else {
        db.findToArray(cli._c, 'topics', {}, function(err, arr) {
            cli.sendJSON({
                section : "topic",
                topics : arr
            });
        }, {
            _id : 1, displayname : 1, completeSlug : 1
        });
    }
}

var needsHomeRefresh = true;
var rQueue = {
    homepage : []
};
var cachedTags = {};
var loadHooks = function(_c, info) {
    endpoints.register(_c.id, ["2012", "2013", "2014", "2015", "2016", "2017", "category"], 'GET', function(cli) {
        cli.redirect(_c.server.url + "/" + 
            cli.routeinfo.path.pop() + 
            (Object.keys(cli.routeinfo.params) ? objToURIParams(cli.routeinfo.params) : "")
        );
    });

    endpoints.register(_c.id, 'tag', 'GET', function(cli) {
        cli.redirect(_c.server.url + '/tags/' + 
            cli.routeinfo.path[1] + 
            (Object.keys(cli.routeinfo.params) ? objToURIParams(cli.routeinfo.params) : "")
        );
    });

    endpoints.registerContextual(_c.id, 'topic', 'GET', serveTopic);

    API.registerApiEndpoint(_c.id + 'homepage', 'GET', serveHomepageAPI);
    API.registerApiEndpoint(_c.id + 'read', 'GET', serveReadAPI);
    API.registerApiEndpoint(_c.id + 'topic', 'GET', serveTopicAPI);

    endpoints.register(_c.id, '', 'GET', function(cli) {
        sharedcache.get("narcityhomepage_" + _c.id, function(resp) {
            if (resp) {
                cli.response.writeHead(200, {CacheType : "RAM", CacheSection : "homepage"});
                return cli.response.end(resp);
            }

            if (rQueue.homepage.push(cli) == 1) {
                fileserver.fileExists(_c.server.html + "/index.html", function(exists) {
                    if (needsHomeRefresh || !exists) {
                        generateHomepage(cli._c, function(content) {
                            needsHomeRefresh = false;
                            rQueue.homepage.forEach(function(qcli) {
                                qcli.response.writeHead(200, {CacheType : "Generated", CacheSection : "homepage"});
                                qcli.response.end(content);
                                log('Narcity', 'Recreated and served homepage');
                            });
                            rQueue.homepage = [];
                        });
                    } else {
                        rQueue.homepage.forEach(function(cli) {
                            fileserver.pipeFileToClient(cli, _c.server.html + '/index.html', noOp, true);
                        });
                        rQueue.homepage = [];
                    }
                });
            }
        });
    });

    var cachedHot = [];
    var hotRefreshNeeded = true;
    endpoints.register(_c.id, 'whatshot', 'GET', function(cli) {
        var whatshotObjectName = "whatshot_" + _c.id;
        sharedcache.get(whatshotObjectName, function(data) {
            if (!data || (new Date().getTime() - data.at > 1000 * 60 * 5)) {
                getWhatsHot(cli._c, function(hotArr) {
                    cachedHot = hotArr || [];
                    cli.sendJSON(cachedHot);

                    var setobj = {};
                    setobj[whatshotObjectName] = {
                        articles : cachedHot,
                        at : new Date().getTime(),
                        at_human_readable : new Date()
                    };

                    sharedcache.set(setobj);
                });
            } else {
                cli.sendJSON(data.articles);
            }
        });
    });

    ["tags", "author", "topic", "search", "latests"].forEach(function(archType) {
        endpoints.register(_c.id, archType, 'GET', function(cli) { serveArchive(cli, archType); }); 
    });

    endpoints.register(_c.id, 'lilium', 'GET', function(cli) {
        if (cli.userinfo.loggedin && cli.hasRight('dash')) {
            cli.redirect(cli._c.server.url + "/liliumflower");
        } else {
            cli.throwHTTP(204, "", true);
        }
    });

    endpoints.register(_c.id, 'liliumflower', 'GET', function(cli) {
        if (cli.userinfo.loggedin && cli.hasRight('dash')) {
            var key = "lilium_flower_script_" + cli._c.uid;
            sharedcache.get(key, function(js) {
                if (js) {
                    cli.response.writeHead(200, {"Content-Type" : "text/javascript"});
                    cli.response.end(js);
                } else {
                    var lmlfile = cli._c.server.base + "/flowers/narcity/precomp/js/lilium.js.lml";
                    fileserver.readFile(lmlfile, function(lmlstring) {
                        LML2.compileToString(cli._c.id, lmlstring, {config : cli._c, minify : true}, function(js) {
                            cli.response.writeHead(200, {"Content-Type" : "text/javascript"});
                            cli.response.end(js);

                            var setobj = {};
                            setobj[key] = js;
                            sharedcache.set(setobj);
                        });
                    }, false, 'utf8');
                }
            });
        } else {
            cli.throwHTTP(204, "", true);
        }
    });

    endpoints.register(_c.id, 'liliumstyle', 'GET', function(cli) {
        if (cli.userinfo.loggedin && cli.hasRight('dash')) {
            var key = "lilium_flower_style_" + cli._c.uid;
            sharedcache.get(key, function(css) {
                if (css) {
                    cli.response.writeHead(200, {"Content-Type" : "text/css"});
                    cli.response.end(css);
                } else {
                    var lmlfile = cli._c.server.base + "/flowers/narcity/precomp/css/lilium.css.lml";
                    fileserver.readFile(lmlfile, function(lmlstring) {
                        LML2.compileToString(cli._c.id, lmlstring, {config : cli._c, minify : true}, function(css) {
                            cli.response.writeHead(200, {"Content-Type" : "text/css"});
                            cli.response.end(css);

                            var setobj = {};
                            setobj[key] = css;
                            sharedcache.set(setobj);
                        });
                    }, false, 'utf8');
                }
            });
        } else {
            cli.throwHTTP(204, "", true);
        }
    });

    endpoints.register(_c.id, 'articlestats', 'GET', function(cli) {
        if (cli.userinfo.loggedin && cli.hasRight('dash')) {
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
        if (cli.userinfo.loggedin && cli.hasRight('dash') && cli._c.chartbeat && cli._c.chartbeat.api_key) {
            var requrl = chartbeaturl.replace('[key]', cli._c.chartbeat.api_key).replace('[host]', cli._c.chartbeat.host) +
                cli.routeinfo.params.url + 
                (cli._c.chartbeat.section ? "&section=" + cli._c.chartbeat.section : "");
            
            var key = "chartbeat_url_cache_" + cli.routeinfo.params.url;
            sharedcache.get(key, function(obj) {
                if (obj && new Date().getTime() - obj.at < 6000) {
                    cli.sendJSON(obj.body);
                } else {
                    require('request')(requrl, function(err, resp, bod) {
                        var setobj = {}
                        setobj[key] = {
                            body : bod,
                            at : new Date().getTime()
                        };

                        cli.sendJSON(bod);
                        sharedcache.set(setobj);
                    });
                }
            });
        } else {
            cli.throwHTTP(204, "", true);
        }
    });

    endpoints.register(_c.id, 'feed', 'GET', function(cli) {
        serveFeed(cli);
    });

    if (process.env.instancenum == 0) {
        log('RSS', "Recreating main RSS feed for website " + _c.website.sitetitle);
        setInterval(function() {
            generateRSS(_c, undefined, function() {});
        }, 1000 * 60 * 60);

        generateRSS(_c, undefined, function() {});
    }

    hooks.bind('homepage_needs_refresh_' + _c.uid, 1, function(pkg) { 
        generateHomepage(pkg._c || pkg.cli._c, pkg.callback);
    });

    hooks.bind('topic_needs_refresh_' + _c.uid, 1, function(pkg) {
        renderTopicArchive(pkg._c, pkg.topic, pkg.index || 1, pkg.callback || function() {}); 
    });

    hooks.bind('rss_needs_refresh_' + _c.uid, 1, function(pkg) {
        generateRSS(pkg._c, pkg.completeSlug || pkg.topic.completeSlug, pkg.callback || function() {});
    });

    hooks.bind('article_will_create', 2000, function(pkg) { articleChanged(pkg.cli, pkg.article); });
    hooks.bind('article_will_edit',   2000, function(pkg) { articleChanged(pkg.cli, pkg.article); });
    hooks.bind('article_will_delete', 2000, function(pkg) { articleChanged(pkg.cli, pkg.article); });
    hooks.bind('article_will_render', 2000, function(pkg) { 
        // Fix fields
        parseArticleFields(pkg);

        // Replace Instagram scripts
        parseInsta(pkg);
    });

    hooks.bind('article_async_render_' + _c.uid, 1000, articleAsyncRender);
    hooks.bind('insert_ads_' + _c.uid, 1000, insertAds);
    hooks.bind('parse_ads_' + _c.uid, 1000, parseAds);
};

NarcityTheme.prototype.clearCache = function(ctx, detail) {
    switch (ctx) {
        case "home": needsHomeRefresh = true; break;
        case "tags": delete cachedTags[ctx][detail]; break;
        default: break;
    }
};

var parseInsta = function(pkg) {
    pkg.article.content = pkg.article.content.replace(/\<script async\=\"\" defer\=\"\" src\=\"\/\/platform.instagram.com\/en_US\/embeds.js\"\>\<\/script\>/g, "") + '<script async="" defer="" src="//platform.instagram.com/en_US/embeds.js"></script>';
};

var articleAsyncRender = function(pkg) {
    db.join(pkg._c, 'content', [
        {
            $match : {
                _id : {
                    $ne : pkg.article._id
                },
                topic : pkg.article.topic
            }
        }, {
            $sort : {
                date : -1
            }
        }, {
            $limit : 8
        }, {
            $lookup : {
                from:           "uploads",
                localField:     "media",
                foreignField:   "_id",
                as:             "featuredimage"
            }
        }
    ], function(arr) {
        pkg.article.fromtopic = arr;
        parseAds(pkg);
    });
};

var insertAds = function(pkg) {
    var _c = pkg._c;
    var article = pkg.article;
    var done = pkg.done;

    themes.fetchCurrentTheme(_c, function(cTheme) {
        var pcount = cTheme.settings.pperad || 5;
        var jsdom = require('jsdom');
        var content = article.content ? article.content
            .replace(/\<ad\>\<?\/?a?d?\>?/g, "")
            .replace(/\<p\>\&nbsp\;\<\/p\>/g, "")
            .replace(/\n/g, "").replace(/\r/g, "")
            .replace(/\<p\>\<\/p\>/g, "") : "";

        var changed = false;
        jsdom.env(content, function(err, dom) {
            if (err) {
                log("Article", "Error parsing dom : " + err, "err");
                return done(article.content);
            }

            var parags = dom.document.querySelectorAll("body > p, body > h3, body > twitterwidget");
            for (var i = 0; i < parags.length - 1; i++) if ((i-2) % pcount == 0) {
                var adtag = dom.document.createElement('ad');
                dom.document.body.insertBefore(adtag, parags[i+1]);
                changed = true;
            }

            if (changed) {
                content = dom.document.body.innerHTML;
                article.content = content;
                db.update(_c, 'content', {_id : article._id}, {content : content, hasads : true}, function() {
                    log('Article', "Inserted ads inside article with title " + article.title, 'success');
                    done(content);
                });
            } else {
                done();
            }
        });
    });
}

var parseAds = function(pkg) {
    var _c = pkg._c;
    var done = pkg.done;
    var art = pkg.article;

    themes.fetchCurrentTheme(_c, function(cTheme) {
        var adtags = (pkg.article.topic && pkg.article.topic.override && pkg.article.topic.override.adtags) || 
            cTheme.settings.adtags || 
            {};

        var keys = Object.keys(adtags);

        var indx = 0;
        var delimiter = "<ad></ad>"; 
        var pos;

        if (!art.nsfw && keys.length != 0) {
            while ((pos = art.content.indexOf(delimiter)) != -1) {
                art.content = art.content.substring(0, pos) + 
                    '<div class="awrapper">' + adtags[keys[indx]].code + 
                    "</div>" + art.content.substring(pos+delimiter.length);

                indx++;

                if (indx == keys.length) {
                    break;
                    indx = 0;
                }
            }
        }

        art.content = art.content.replace(/\<ad\>\<\/ad\>/g, "");
        done();
    });
};

var parseArticleFields = function(pkg) {
    var art = pkg.article;
    art.tags = art.tags || [];
    art.title = art.title || "";
    art.subtitle = art.subtitle || "";
    art.topic = art.topic || {slug : "", displayname : ""};
}

var registerPrecompFiles = function(_c) {
    // templateBuilder.addJS(path + '/precomp/js/');
    templateBuilder.addCSS(themePath + '/precomp/css/fonts.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/style.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/CoverPop.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/ads.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/ckeditor.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/quill.css.lml', _c.id);
    templateBuilder.addCSS(themePath + '/precomp/css/narcity.css.lml', _c.id);

    templateBuilder.addJS(themePath + '/precomp/js/vaniryk.js.lml', _c.id);
    templateBuilder.addJS(themePath + '/precomp/js/r.js.lml', _c.id);
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

    readersLib = new (require("./readers.js"))(_c).initialize();
    log('Narcity', "Registered Readers Wrapper");

    registerSnips(_c, function() {
        log('Narcity', 'Registered theme snips');

        // Symlink res to html folder
        fileserver.createSymlink(themePath + '/res', _c.server.html + '/res', function() {
            fileserver.createDirIfNotExists(_c.server.html + "/tags", function() {
                fileserver.createDirIfNotExists(_c.server.html + "/whoami", function() {
                    fileserver.createDirIfNotExists(_c.server.html + "/authors", function() {
                        fileserver.createDirIfNotExists(_c.server.html + "/category", function() {
                            readersLib.createCollection(function() {
                                log('Narcity', 'Created symlink and content directories. Ready to callback');
                                callback();
                            });
                        }, true);
                    }, true);
                }, true);
            }, true);
        });
    });
}

NarcityTheme.prototype.disable = function (callback) {
    return callback();
}

module.exports = NarcityTheme;
