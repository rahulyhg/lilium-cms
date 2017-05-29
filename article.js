var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var livevars = require('./livevars.js');
var fs = require('./fileserver.js');
var notifications = require('./notifications.js');
var slugify = require('slug');
var tableBuilder = require('./tableBuilder.js');
var hooks = require('./hooks.js');
var dates = require('./dates.js');
var badges = require('./badges.js');
var moment = require('moment');
var log = require('./log.js');
var feed = require('./feed.js');
var CDN = require('./cdn.js');

var Article = function() {
    var that = this;

    var publishedNotificationTitles = [
        "You got this!",
        "Allllright!",
        "Look at you!",
        "Gratz!",
        "Yes, you did!",
        "You're simply great!",
        "Say whaaat!",
        "Annnd it's live!",
        "You're the real deal!",
        "Guess what!",
        "The MVP; that's you!",
        "YASSSSS",
        "💯🙌🎉",
        "I drink to that!",
        "Three cheers for this one!",
        "Good news!",
        "You. Are. Amazing.",
        "Hooray!"
    ];

    this.adminPOST = function(cli) {
        cli.touch('article.handlePOST');
        switch (cli.routeinfo.path[2]) {
            case 'new':
                if (cli.hasRightOrRefuse("create-articles")) this.create(cli);
                break;
            case 'edit':
                if (cli.hasRightOrRefuse("publish-articles")) this.publish(cli, "create");
                break;
            case 'delete':
                if (cli.hasRightOrRefuse("publish-articles")) this.delete(cli);
                break;
            case 'delete-autosave':
                if (cli.hasRightOrRefuse("create-articles")) this.deleteAutosave(cli);
                break;
            case 'autosave':
                if (cli.hasRightOrRefuse("create-articles")) this.save(cli, true);
                break;
            case 'save':
                if (cli.hasRightOrRefuse("create-articles")) this.save(cli);
                break;
            case 'sendforreview':
                if (cli.hasRightOrRefuse("contributor")) this.sendForReview(cli);
                break;
            case 'refusereview':
                if (cli.hasRightOrRefuse("production")) this.refuseReview(cli);
                break;
            case 'preview':
                if (cli.hasRightOrRefuse("list-articles")) this.publish(cli, "preview");
                break;
            case 'destroy':
                if (cli.hasRightOrRefuse("destroy-articles")) this.delete(cli, true);
                break;
            case 'addfeature':
                if (cli.hasRightOrRefuse("create-articles")) this.addFeature(cli);
                break;
            case 'editslug':
                if (cli.hasRightOrRefuse("create-articles")) this.editSlug(cli);
                break;
            case 'removealias':
                if (cli.hasRightOrRefuse("publish-articles")) this.maybeRemoveAlias(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;
        }
    };

    this.adminGET = function(cli) {
        cli.touch('article.handleGET');
        if (!cli.hasRightOrRefuse("list-articles")) { return; }

        if (cli.routeinfo.path.length == 2) {
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "/list", true);
        } else {
            switch (cli.routeinfo.path[2]) {
                case 'new':
                    cli.hasRight('create-articles') ?
                        filelogic.serveAdminLML(cli) :
                        cli.refuse();
                    break;
                case 'edit':
                    if (cli.hasRight('create-articles')) {
                        var action = cli.routeinfo.path[4];

                        if (action) {
                            switch(action) {
                                case "history":
                                    break;
                                default:
                                    cli.throwHTTP(404, 'Not Found');
                            }
                        } else {
                            this.edit(cli);
                        }
                    }
                    break;
                case 'getArticle':
                    this.getArticle(cli);
                    break;
                case 'list':
                    this.list(cli);
                    break;
                case 'infostrip':
                    this.infoStrip(cli);
                    break;
                default:
                    return cli.throwHTTP(404, 'Not Found');
            }
        }
    };

    this.toPresentable = function(_c, article) {
        article.identifier = article._id.toString();
        article._id = undefined;

        if (article.topic) {
            article.topic = {
                displayname : article.topic.displayname,
                slug : article.topic.slug,
                completeSlug : article.topic.completeSlug
            }
        }

        article.topics = undefined;
        article.subscribers = undefined;
        article.autosaveid = undefined;
        article.media = undefined;
        article.aliases = undefined;

        article.impressions = undefined;
        article.targetimpressions = undefined;
        article.targetdate = undefined;
        article.form_name = undefined;

        article.industry = undefined;

        article["publish-set"] = undefined;
        article["persona-select"] = undefined;

        if (article.featuredimage && article.featuredimage[0]) {
            var featimgs = {};
            for (var size in article.featuredimage[0].sizes) {
                featimgs[size] = CDN.parseOne(_c, article.featuredimage[0].sizes[size].url);
            }
            article.featuredimage = featimgs;
        }

        if (article.authors && article.authors[0]) {
            article.author = article.authors[0];
            article.author = {
                displayname : article.author.displayname,
                avatarURL : article.author.avatarURL,
                slug : article.author.slug
            };

            article.authors = undefined;
        }

        for (var k in article) {
            if (k.indexOf('title-') == 0 || k.indexOf('lml') == 0) {
                article[k] = undefined;
            }
        }

        return article;
    }

    this.apiGET = function(cli) {
        var ftc = cli.routeinfo.path[2];
        if (ftc == "get") {
            var slug = cli.routeinfo.path[3];
            that.deepFetch(cli._c, slug, function(article) {
                if (!article) {
                    cli.throwHTTP(404);
                } else {
                    cli.sendJSON(
                        that.toPresentable(cli._c, article)
                    );
                }
            }, false, {status : "published"})
        } else {
            cli.throwHTTP(404);
        }
    };

    this.query = function(cli, opts, cb) {
        db.paramQuery(cli, opts, cb);
    };

    this.list = function(cli) {
        filelogic.serveAdminLML(cli, false);
    };

    this.infoStrip = function(cli) {
        db.findToArray(cli._c, 'content', {_id : db.mongoID(cli.routeinfo.path[3])}, function(err, arr) {
            if (arr.length != 0) {
                var art = arr[0];
                db.findToArray(conf.default(), 'entities', {_id : art.author}, function(err, autarr) {
                    db.findUnique(cli._c, 'topics', {_id : art.topic}, function(err, topic) {
                        db.count(cli._c, 'history', {contentid : db.mongoID(cli.routeinfo.path[3])}, function(err, modcount) {
                            cli.sendJSON({
                                status : art.status || "Unknown",
                                url : art.name ? 
                                    (cli._c.server.url + "/" + (art.topic ? topic.completeSlug : "") + "/" + art.name) : 
                                    "This article doesn't have a URL.",
                                siteurl : cli._c.server.url,
                                aliases : art.aliases ? Array.from(new Set(art.aliases)) : [],
                                updated : art.updated || "This article was never updated",
                                author : autarr[0] ? autarr[0].displayname : "This article doesn't have an author",
                                modifications : modcount
                            });
                        });
                    });
                });
            } else {
                cli.sendJSON({error : "Article not found"});
            }
        });
    };

    this.removeAlias = function(conf, article, alias, cb) {
        var aliases = article.aliases || [];
        var index = aliases.indexOf(alias);
        if (index != -1) {
            aliases.splice(index, 1);
        }
        
        log('Content', "Removing alias " + alias + " from article " + article.title + " at index " + index);
        db.update(conf, 'content', {_id : article._id}, {aliases : aliases}, cb || function() {});
    };

    this.maybeRemoveAlias = function(cli) {
        var cond = {
            _id : db.mongoID(cli.postdata.data.articleid)
        };

        if (!cli.hasRight('editor')) {
            cond.author = db.mongoID(cli.userdata.userid);
        }

        db.findUnique(cli._c, 'content', cond, function(err, article) {
            if (err || !article) {
                cli.sendJSON({error : "Missing rights or article not found"});
            } else {
                that.removeAlias(cli._c, article, cli.postdata.data.alias, function() {
                    cli.sendJSON({error : false, success : true});
                });
            }
        });
    };

    this.batchFetch = function(conf, idsOrNames, cb, conditions) {
        var i = -1;
        var deepArticles = [];
        var next = function() {
            if (++i == idsOrNames.length) {
                cb(deepArticles);
            } else {
                that.deepFetch(conf, idsOrNames[i], function(art) {
                    deepArticles.push(art);
                    next();
                });
            }
        };

        next();
    };

    this.deepFetch = function(conf, idOrName, cb, preview, extraconds) {
        conf = conf._c || conf;
        var cond = extraconds || {};
        cond[typeof idOrName === "string" ? "name" : "_id"] = idOrName;

        db.join(conf, preview ? 'preview' : 'content', [
            {
               $match : cond
            }, {
                $lookup:{
                    from:           "uploads",
                    localField:     "media",
                    foreignField:   "_id",
                    as:             "featuredimage"
                }
            }
        ], function(arr) {
            if (arr.length === 0) {
                cb(false, new Error("No article found"));
            } else {
                var article = arr[0];
                /*
                var titlekeywords = (arr[0].title || art[0].name).replace(/[^a-zA-Z\s]/g, '').split( ' ' ).filter(function ( str ) {
                    var word = str.match(/(\w+)/);
                    return word && word[0].length > 3;
                }).join( ' ' );
                */
                db.rawCollection(conf, preview ? "preview" : 'content', {"strict":true}, function(err, col) {
                    col.aggregate([{
                        $match : {
                            _id : {
                                $lt : article._id
                            }, 
                            topic : article.topic,
                            /*$text : { 
                                $search : titlekeywords
                            },
                            $and : [
                                {date : {$gt : new Date(new Date(article.date).getTime() - (1000 * 60 * 60 * 24 * 31 * 6) )}},
                                {date : {$lt : new Date(article.date)}}
                            ],*/
                            status : "published",
                        }
                    },{
                        // Sort content by what matches the highest
                        $sort : { 
                            /*score: { 
                                $meta: "textScore" 
                            },*/
                            date : -1 
                        }
                    },{
                        // Only one related
                        $limit : 1
                    },{
                        // Get featured image 
                        $lookup : {
                            from:           "uploads",
                            localField:     "media",
                            foreignField:   "_id",
                            as:             "featuredimage"
                        }
                    }]).next(function(err, related) {
                        var continueWorking = function() {
                            var continueWithAuthor = function() {
                                db.findToArray(require("./config.js").default(), 'entities', {_id : article.author}, function(err, autarr) {
                                    article.authors = autarr;

                                    var evts = hooks.getHooksFor('article_deepfetch');
                                    var keys = Object.keys(evts);
                                    var kIndex = -1;

                                    var next = function() {
                                        kIndex++;

                                        if (kIndex == keys.length) {
                                            hooks.fire('article_will_fetch', {
                                                _c : conf,
                                                article: article
                                            });
                                        
                                            cb(article);
                                        } else {
                                            evts[keys[kIndex]].cb(conf, article, next);
                                        }
                                    };

                                    next();
                                });
                            };
                            
                            require('./topics.js').deepFetch(conf, article.topic, function(deepTopic, family) {
                                if (deepTopic) {
                                    article.topics = family;
                                    article.topicslug = "/" + deepTopic.completeSlug + "/";
                                } else {
                                    article.topics = [];
                                    article.topicslug = "/";
                                }

                                article.topic = deepTopic;
                                article.url = conf.server.protocol + conf.server.url + article.topicslug + article.name;
                                article.amp = conf.server.protocol + conf.server.url + "/amp" + article.topicslug + article.name;

                                if (article.related) {
                                    article.related.url = conf.server.protocol + conf.server.url + article.topicslug + related.name;
                                }

                                continueWithAuthor();
                            });
                        };

                        article.related = related;
                        continueWorking();
                    });
                });
            }
        });
    };

    this.refreshTagSlugs = function(_c, cb) {
        db.find(_c, 'content', {}, [], function(err, cursor) {
            var handleNext = function() {
                cursor.hasNext(function(err, hasnext) {
                    if (hasnext) {
                        cursor.next(function(err, dbart) {
                            var tagslugs = dbart.tags.map(function(tagname) {
                                return slugify(tagname).toLowerCase();
                            });

                            db.update(_c, 'content', {_id : db.mongoID(dbart._id)}, {tagslugs : tagslugs}, handleNext);
                        });
                    } else {
                        cb();
                    }
                });
            };

            handleNext();
        });
    };

    this.sendForReview = function(cli) {
        var cid = cli.routeinfo.path[3];
        var conds = {
            _id : db.mongoID(cid)
        };

        db.findUnique(cli._c, 'content', conds, function(err, article) {
            if (cli.hasRight('editor') || cli.userinfo.userid == article.author.toString()) {
                db.update(cli._c, 'content', conds, {status : "reviewing"}, function() {
                    cli.sendJSON({changed : true});
                });

                db.findToArray(require('./config.js').default(), 'entities', {roles : "production"}, function(err, produser)  {
                    db.findUnique(require('./config.js').default(), 'entities', 
                        {_id : db.mongoID(cli.userinfo.userid)}, 
                        function(err, contractor) {
                        for (var i = 0; i < produser.length; i++) {
                            require('./mail.js').triggerHook(cli._c, 'article_sent_for_review', produser[i].email, {
                                to : produser[i],
                                article : article,
                                contractor : contractor
                            });
                        }
                    });
                });
            } else {
                cli.throwHTTP(401, true);
            }
        });
    };

    this.refuseReview = function(cli) {
        db.update(cli._c, 'content', {_id : db.mongoID(cli.routeinfo.path[3]), status : "reviewing"}, {status : "draft"}, function() {
            cli.sendJSON({success : true});
        });
    };

    this.addFeature = function(cli) {
        var featurename = cli.postdata.data.feature;
        var conds = {
            _id : db.mongoID(cli.routeinfo.path[3])
        };        

        if (!cli.hasRight("editor")) {
            conds.author = db.mongoID(cli.userinfo.userid);
        }

        if (cli.postdata.data.overwrite !== true) {
            conds.feature = {$exists : false};
        }

        var featuredata = cli.postdata.data.props;

        db.update(cli._c, 'content', conds, {
            feature: featurename,
            featuredata : featuredata
        }, function() {
            log('Content', 'Added feature "' + featurename + '" to article with id ' + cli.routeinfo.path[3]);
            cli.sendJSON({done : true})
        });
    };

    this.insertAds = function(_c, article, done, force) {
        if ((article.isSponsored || article.nsfw && !force) || !_c.content) {
            return done(article.content);
        }

        var asyncHooks = hooks.getHooksFor('insert_ads_' + _c.uid);
        var aKeys = Object.keys(asyncHooks);
        var aIndex = -1;

        var nextHook = function() {
            if (++aIndex == aKeys.length) {
                done(article.content);
            } else {
                asyncHooks[aKeys[aIndex]].cb({
                    _c : _c,
                    article : article,
                    done : nextHook
                }, 'insert_ads_' + _c.uid);
            }
        };
        nextHook();
    };

    this.updateActionStats = function(_c, deepArticle, callback, reduce) {
        db.findUnique(_c, 'content', {_id : deepArticle._id || deepArticle}, (err, article) => {
            var stats = {
                $inc : {
                    p   : countOcc(article, '</p>') * (reduce ? -1 : 1),
                    img : countOcc(article, '<img') * (reduce ? -1 : 1),
                    ad  : countOcc(article, '<ad>') * (reduce ? -1 : 1)
                }
            };
            var entity = db.mongoID(deepArticle.author);

            db.update(conf.default(), 'actionstats', {entity, type : "article_content"}, stats, function(err, r) {
                callback && callback(r.value);
            }, true, true, true, true);
        });
    };

    this.create = function(cli) {
        cli.touch('article.create');
        var articleObject = {};

        articleObject.title = cli.postdata.data.title;
        articleObject.author = db.mongoID(cli.userinfo.userid);
        articleObject.updated = new Date();
        articleObject.createdOn = new Date();
        articleObject.status = "draft";
        articleObject.type = "post";
        articleObject.content = "";
        articleObject.createdBy = db.mongoID(cli.userinfo.userid);
        articleObject.subscribers = [articleObject.createdBy];

        var commitToCreate = function() {
            db.insert(cli._c, 'content', articleObject, function(err, result) {
                var id = articleObject._id;
                cli.sendJSON({
                    articleid : id,
                    editurl : cli._c.server.url + "/admin/article/edit/" + id,
                    error : err,
                    valid : !err
                });
            });
        };

        if (cli.userinfo.roles.indexOf('contributor') != -1) {
            db.findToArray(conf.default(), 'entities', {roles : "production"}, function(err, arr) {
                for (var i = 0; i < arr.length; i++) {
                    articleObject.subscribers.push(arr[i]._id);
                }

                commitToCreate();
            }, {_id : 1});
        } else {
            commitToCreate();
        }
    };

    
    this.publish = function(cli, pubCtx) {
        cli.touch('article.new');
        pubCtx = pubCtx || "create";

        var dbCol = {
            "create" : "content",
            "preview" : "preview"
        }

        if (pubCtx == "publish" && !cli.hasRight('publish-articles')) {
            return cli.throwHTTP(403, true);
        }

        var that = this;
        if (cli.hasRight('list-articles')) {
            var oldSlug = "";
            var wasNotPublished = false;
            var redirect = '';

            if (true || response.success) {
                var formData = cli.postdata.data; //formBuilder.serializeForm(form);
                formData.status = 'published';

                if (!cli.postdata.data._keepURL || cli.postdata.data._keepURL == "false") {
                    formData.name = slugify(formData.title).toLowerCase();
                    oldSlug = cli.postdata.data.currentSlug;
                }

                var newSlug = formData.name;

                formData.author = formData.author ? db.mongoID(formData.author) : cli.userinfo.userid;
                formData.date = new Date(dates.toTimezone(formData.date !== '' ? formData.date : new Date(), cli._c.timezone));
                formData.media = db.mongoID(formData.media);
                formData.topic = formData.topic ? db.mongoID(formData.topic) : undefined;
                formData.updated = new Date();
                hooks.fire('article_will_' + pubCtx, {
                    cli: cli,
                    article: formData
                });

                if (formData.topic) {
                    db.update(cli._c, "topics", {_id : formData.topic}, {lastUsed : new Date()});
                    require('./topics.js').generateTopicLatestJSON(cli._c, formData.topic);
                }

                var conds = {
                    _id: cli.postdata.data.id ? db.mongoID(cli.postdata.data.id) : "Will not resolve"
                }; 

                if (formData.tags && formData.tags.map) {
                    formData.tagslugs = formData.tags.map(function(tagname) {
                        return slugify(tagname).toLowerCase();
                    });
                } else {
                    formData.tags = [];
                    formData.tagslugs = [];
                }

                log('Article', 'Saving published post in database', 'info');
                db.findToArray(cli._c, 'content', conds, function(err, arr) {
                    var nUpdate = function() {
                        db.update(cli._c, dbCol[pubCtx], conds, formData, function(err, result) {
                            if (!err) {
                                var postUpdate = function() {
                                    var success = true;
                                    var createdArticle = false;
                                    if (result.upsertedId !== null) {
                                        // Inserted a document
                                        formData._id = result.upsertedId._id;
                                        createdArticle = true;
                                    } else if (result.modifiedCount > 0) {
                                        // Updated a document
                                        formData._id = cli.postdata.data.id;
                                    } else {
                                        // Nothing happened, failed...
                                        success = false;
                                    }

                                    if (success) {
                                        log('Article', 'Saved published post to database; Creating cached file');
                                        cli.did('content', 'published', {title : cli.postdata.data.title});

                                        hooks.fire('article_published', {
                                            cli: cli,
                                            article: formData,
                                            _c : cli._c
                                        });

                                        if (pubCtx === "create") {
                                             if (oldSlug) {
                                                db.update(cli._c, 'content', 
                                                    {_id : db.mongoID(formData._id)}, 
                                                    {$push : {aliases : oldSlug}}, 
                                                function() {
                                                    log('Article', 'Added alias for slug ' + oldSlug);
                                                    fileserver.deleteFile(cli._c.server.html + "/" + oldSlug + ".html", function() {});
                                                }, false, true, true);
                                            }

                                            db.update(cli._c, 'content', 
                                                {_id : db.mongoID(formData._id)}, 
                                                {$addToSet : {subscribers : {$each : [
                                                    db.mongoID(cli.userinfo.userid),
                                                    formData.author
                                                ]}}}, 
                                                function() {}, false, true, true
                                            );

                                            that.generateArticle(cli._c, db.mongoID(formData._id), function(resp) {
                                                resp.newlyPublished = wasNotPublished;
                                                cli.sendJSON(resp);
                                                var deepArticle = resp.deepArticle;

                                                // Remove autosaves related to this article
                                                if (cli.postdata.data.autosaveid) {
                                                    db.remove(
                                                        cli._c,
                                                        'autosave',
                                                        {
                                                            _id: db.mongoID(cli.postdata.data.autosaveid.replace(' ', ''))
                                                        },
                                                        function() {}
                                                    );
                                                }

                                                if (cli._c.social.facebook.appid && cli._c.social.facebook.token) {
                                                    log('Facebook', 'Sending request to debug link');
                                                    require('request')({
                                                        url : 'https://graph.facebook.com/v' + cli._c.social.facebook.apiversion || "2.8",
                                                        body : {
                                                            scrape : true,
                                                            access_token : cli._c.social.facebook.token,
                                                            id : cli._c.server.protocol + cli._c.server.url + "/" + deepArticle.name
                                                        },
                                                        json : true,
                                                        method : "POST"
                                                    }, function(a, b, c) {
                                                        if (c && c.title) {
                                                            log('Facebook', 'Debugger responded with title', "success");
                                                            notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                                                title: "Facebook Graph",
                                                                msg: '<i>'+deepArticle.title+'</i> has been debugged on Facebook Graph.',
                                                                type: 'log'
                                                            });
                                                        } else {
                                                            log('Facebook', 'Debugger responded with error', "warn");
                                                            notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                                                title: "Facebook Graph",
                                                                url : "https://developers.facebook.com/tools/debug/og/object/",
                                                                msg: '<i>'+deepArticle.title+'</i> was not debugged on Facebook Graph.',
                                                                type: 'warning'
                                                            });
                                                        }
                                                    });
                                                }
            
                                                var maybeTopic = formData.topic && db.mongoID(formData.topic);
                                                db.findUnique(cli._c, 'topics', { _id : maybeTopic  }, function(err, tObject) {
                                                    var nlen = publishedNotificationTitles.length;
                                                    var notifMessage = publishedNotificationTitles[Math.floor(nlen / Math.random()) % nlen];
                                                    notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                                        title: notifMessage,
                                                        url: cli._c.server.url + (tObject ? ("/" + tObject.completeSlug) : "") + '/' + deepArticle.name,
                                                        msg: (deepArticle.isPaginated ? "Paginated article " : "Article ") + '<i>'+deepArticle.title+'</i> has been published. Click here to see it live.',
                                                        type: 'success'
                                                    });

                                                    tObject && require('./topics.js').deepFetch(
                                                        cli._c, 
                                                        maybeTopic, 
                                                    function(topic, parents) {
                                                        parents.forEach(function(sTopic) {
                                                            hooks.fire('rss_needs_refresh_' + cli._c.uid, {
                                                               _c : cli._c,
                                                                completeSlug : sTopic.completeSlug,
                                                                callback : function() {
                                                                    log('Article', "RSS feed was refresh, received callback");
                                                                }
                                                            });
                                                        });
                                                    });
                                                });

                                                if (wasNotPublished) {
                                                    that.updateActionStats(cli._c, deepArticle, function() {
                                                        hooks.fire('article_published_from_draft', {
                                                            article: deepArticle,
                                                            _c : cli._c
                                                        });
                                                    });
                                                }

                                                feed.plop(deepArticle._id, function() {
                                                    feed.push(deepArticle._id, cli.userinfo.userid, 'published', cli._c.id, {
                                                        title : deepArticle.title,
                                                        subtitle : deepArticle.subtitle,
                                                        slug : deepArticle.name,
                                                        image : deepArticle.featuredimage[0].sizes.square.url,
                                                        authorname : deepArticle.authors[0].displayname,
                                                        authoravatar : deepArticle.authors[0].avatarURL
                                                    });
                                                });
                                            }, false, "all");
                                        } else if (pubCtx === "preview") {
                                            var tmpName = "static/tmp/preview" + 
                                                Math.random().toString().slice(2) + 
                                                Math.random().toString().slice(2) + 
                                                ".tmp";
                                            var absPath = cli._c.server.html + "/" + tmpName;

                                            log('Preview', 'Deep fetching article for preview : ' + formData._id);
                                            that.deepFetch(cli._c, db.mongoID(formData._id), function(deepArticle) {
                                                var extra = {};
                                                extra.ctx = "article";
                                                extra.article = deepArticle;
                                                extra.topic = deepArticle.topic;
                                                extra.preview = true;

                                                log('Preview', 'Rendering HTML for previewed post');
                                                filelogic.renderThemeLML(cli._c, "article", tmpName, extra, function() {
                                                    log('Preview', 'Sending preview file before deletion : ' + absPath);
                                                    var fileserver = require('./fileserver.js');
                                                    fileserver.pipeFileToClient(cli, absPath, function() {
                                                        fileserver.deleteFile(absPath, function() {});
                                                    }, true);
                                                });
                                            }, true);
                                        }
                                    } else {
                                        cli.throwHTTP(500);
                                    }
                                };
    
                                if (pubCtx == "preview") {
                                    postUpdate();
                                } else {
                                    require('./history.js').pushModification(cli, arr[0], arr[0]._id, postUpdate);
                                }
                            } else {
                                cli.throwHTTP(500);
                            }
                        }, true, true);
                    };

                    if (arr && arr[0] && arr[0].status != "published") {
                        wasNotPublished = true;
                        formData.date = new Date(dates.toTimezone(new Date(), cli._c.timezone));
                    }

                    nUpdate();
                });
            } else {
                cli.sendJSON({
                    form: response
                });
            }
        } else {
            cli.throwHTTP(401);
        }
    };

    /**
     * Saves an article based on some parameters
     * The cli should contain (Both not mandatory):
     * - contentid, the id of the original content if the save is an autosave
     * - _id, the id of whether the original content or of the auto save if it is an autosave
     */
    this.save = function(cli, auto) {
        // Article already exists
        cli.postdata.data.form_name = "post_create";

        //var form = formBuilder.handleRequest(cli);
        var formData = cli.postdata.data; // formBuilder.serializeForm(form);
        var id;

        if (cli.postdata.data.autosaveid) {
            db.remove(cli._c, 'autosave', {
                _id: db.mongoID(cli.postdata.data.autosaveid.replace(" ", ""))
            }, function() {});
        }

        formData.author = formData.author ? db.mongoID(formData.author) : db.mongoID(cli.userinfo.userid);
        formData.media = db.mongoID(formData.media);
        formData.updated = new Date();
        formData.date = formData.date ? new Date(dates.toTimezone(formData.date !== '' ? formData.date : new Date(), cli._c.timezone)) : undefined;
        formData.topic = formData.topic ? db.mongoID(formData.topic) : undefined;

        if (formData.tags && formData.tags.map) {
            formData.tagslugs = formData.tags.map(function(tagname) {
                return slugify(tagname).toLowerCase();
            });
        }

        if (!formData.date) {
            delete formData.date;
        }

        log('Article', 'Preparing to save article ' + formData.title);
        // Autosave
        if (auto) {
            // Check if article is edit, non-existing or published
            if (cli.postdata.data.contentid) {
                db.update(cli._c, 'content', {
                    _id: db.mongoID(cli.postdata.data.contentid),
                    status : {$ne : "published"}
                }, formData, function(err, docs) {
                    // Is a draft article
                    cli.sendJSON({
                        success: true,
                        _id: cli.postdata.data.contentid,
                        contentid: cli.postdata.data.contentid
                    });
                });
            } else {
                cli.sendJSON({
                    success: false,
                    contentid: cli.postdata.data.contentid
                });
            }
        } else {
            if (cli.postdata.data._id) {
                // Update draft
                id = db.mongoID(cli.postdata.data._id);

                // Check if user can edit this article
                db.findToArray(cli._c, 'content', {
                    _id: id
                }, function(err, ress) {
                    var res = err ? undefined : ress[0];
                    if (!err && (res.author.toString() == cli.userinfo.userid.toString() || cli.hasRight('editor'))) {
                        log('Article', 'Updating content for article ' + formData.title);
                        delete formData._id;
                        db.update(cli._c, 'content', {
                            _id: id
                        }, formData, function(err, doc) { 
                            require("./history.js").pushModification(cli, res, res._id, function(err, revision) {    
                                cli.sendJSON({
                                    success: true,
                                    _id: cli.postdata.data._id,
                                    reason : 200
                                });
                            });
                            db.update(cli._c, 'content', 
                                {_id : id}, {$addToSet : {subscribers : db.mongoID(cli.userinfo.userid)}}, 
                                function() {}, false, true, true
                            );
                        });
                    } else {
                        cli.sendJSON({
                            success: false,
                            _id: cli.postdata.data._id,
                            reason : 403
                        });
                    }
                });
            } else {
                cli.sendJSON({
                    success: false,
                    reason : 404,
                    message : "ID not found"
                });
            }
        }
    };

    this.preview = function(cli) {
        this.publish(cli, "preview");
        return;
    };

    this.edit = function(cli) {
        var that = this;
        if (cli.routeinfo.path[3]) {

            var id = db.mongoID(cli.routeinfo.path[3]);
            if (cli.method == 'POST') {

                var form = formBuilder.handleRequest(cli);
                var response = formBuilder.validate(form, true);

                if (response.success) {
                    formData = formBuilder.serializeForm(form);

                    if (!cli.postdata.data._keepURL) {
                        formData.name = slugify(formData.title).toLowerCase();
                    }

                    formData.media = db.mongoID(formData.media);
                    formData.updated = new Date();
                    formData.status = 'published';
                    formData.date = new Date(formData.date);

                    if (formData.tags.map) {
                        formData.tagslugs = formData.tags.map(function(tagname) {
                            return slugify(tagname).toLowerCase();
                        });
                    }

                    db.findToArray(cli._c, 'content', {
                        _id: id
                    }, function(err, row) {
                        if (err || row.length == 0) {
                            cli.sendJSON({
                                success: false,
                                error: "Content not found for id " + id
                            });

                            return;
                        }

                        // Check if user can edit this article
                        if (cli.userinfo.userid !== row[0]._id && !cli.hasRight('modify_all_articles')) {
                            cli.throwHTTP(405);
                        }

                        hooks.fire('article_will_edit', {
                            cli: cli,
                            old: row,
                            article: formData
                        });

                        db.findAndModify(cli._c, 'content', {
                            _id: id
                        }, formData, function(err, r) {
                            that.deepFetch(cli._c, id, function(deepArticle) {
                                cli.did('content', 'edited', {title : cli.postdata.data.title});
                                
                                hooks.fire('article_edited', {
                                    cli: cli,
                                    article: r.value
                                });
   
                                var extra = {};
                                extra.article = deepArticle;
                                extra.topic = deepArticle.topic;
                                extra.ctx = "article";
 
                                filelogic.renderThemeLML(cli, "article", formData.name + '.html', extra , function(name) {
                                    notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                        title: "Article is updated!",
                                        url: cli._c.server.url + '/' + formData.name,
                                        msg: "Your changes are live. Click to see the live article.",
                                        type: 'success'
                                    });
                                });
    
                                cli.sendJSON({
                                    success: true
                                });
                            });
                        });
                    });

                } else {
                    cli.sendJSON({
                        form: response
                    });
                }

            } else {
                filelogic.serveAdminLML(cli, true);
            }


        } else {
            cli.throwHTTP(404, 'Article Not Found');
        }
    }

    this.editSlug = function(cli) {
        if (cli.routeinfo.path[3]) {
            var newslug = cli.postdata.data.slug;
            if (!newslug) {
                cli.sendJSON({error : "Missing slug", success : false});
            } else {
                if (/^[a-z0-9\-]+$/.test(newslug)) {
                    var id = db.mongoID(cli.routeinfo.path[3]);
                    db.findUnique(cli._c, 'content', {_id : id}, function(err, article) {
                        if (cli.hasRight('editor') || article.author.toString() == cli.userinfo.userid.toString()) {
                            var aliases = article.aliases || [];
                            aliases.push(article.name);
                            db.update(cli._c, 'content', {_id : id}, {name : newslug, aliases : aliases}, function() {
                                cli.sendJSON({success : true});
                            });
                        } else {
                            cli.sendJSON({error : "Missing rights", success : false});
                        }
                    });
                } else {
                    cli.sendJSON({error : "Bad slug format", success : false});
                }
            }
        } else {
            cli.sendJSON({error : "Missing content ID", success : false})
        }
    };

    this.deleteAutosave = function(cli) {
        if (cli.routeinfo.path[3]) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            db.remove(cli._c, 'autosave', {
                _id: id
            }, function(err, res) {
                return cli.sendJSON({
                    redirect: cli._c.server.url + '/admin/article/list',
                    success: true
                });
            });
        }
    }

    this.delete = function(cli, destroy) {
        if (cli.routeinfo.path[3]) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            db.findToArray(cli._c, 'content', {
                _id: id
            }, function(err, results) {
                var result = err ? undefined : results[0];
                if (result) {
                    if (cli.hasRight('editor') || result.author.toString() == cli.userinfo.userid.toString()) {
                        // Can delete the current article
                        hooks.fire('article_will_delete', id);
                        that.updateActionStats(cli._c, result, function() {}, true);

                        db.update(cli._c, 'content', {
                            _id: id
                        }, {
                            status: destroy ? 'destroyed' : 'deleted'
                        }, function(err, r) {
                            cli.did('content', destroy ? 'destroyed' : 'deleted', {id : id});
                            
                            var filename = cli._c.server.html + "/" + result.name + '.html';
                            fs.deleteFile(filename, function() {
                                hooks.fire('article_deleted', {id : id, cli : cli, _c : cli._c});
                            });

                            // Remove autosave pointing to article deleted
                            db.remove(cli._c, 'autosave', {
                                contentid: id
                            }, function() {
                                require('./history.js').pushModification(cli, result, id, function() {
                                    return cli.sendJSON({
                                        redirect: cli._c.server.url + '/admin/article/list',
                                        success: true
                                    });
                                });
                            }, false);

                        });
                    } else {
                        return cli.throwHTTP(401);
                    }
                } else {
                    return cli.throwHTTP(404);
                }
            });


        } else {
            return cli.throwHTTP(404, 'Article Not Found');
        }
    }

    this.getArticle = function(cli) {
        var id = new mongo.ObjectID(cli.routeinfo.path[3]);
        db.find(cli._c, 'content', {
            '_id': id
        }, {
            limit: [1]
        }, function(err, cursor) {
            cursor.next(function(err, article) {
                if (article) {
                    cli.sendJSON({
                        form: formBuilder.unescapeForm(article)
                    });
                } else {
                    cli.throwHTTP(404, 'Article Not Found');
                }
                cursor.close();
            });
        });

        // Return article object from DB
    };

    var countOcc = function(article, occ) {
        var content = article.content || article || "";

        var i = 0;
        var count = -1;
        do {
            count++;
            i = content.indexOf(occ, i) + 1;
        } while (i != 0)

        return count;
    };

    this.generatePublishReport = function(_c, $match, sendback) {
        db.join(_c, 'content', [
            {$match},
            {$limit : 1},
            {
                $lookup : {
                    from : "uploads",
                    localField : "media",
                    foreignField : "_id",
                    as : "featuredimage"
                }
            }, {
                $lookup : {
                    from : "topics",
                    localField : "topic",
                    foreignField : "_id",
                    as : "topicobject"
                }
            }
        ], function(arr) {
            if (arr.length == 0) {
                return sendback({notfound : 1})
            }

            var art = arr.pop();
            var author = art.author;
            var topic = art.topicobject.pop();
            var featuredimage = art.featuredimage.pop();

            // Topic projection
            topic = {
                displayname : topic.displayname, 
                completeSlug : topic.completeSlug
            }

            // Today
            var start = new Date();
            start.setHours(0,0,0,0);

            var end = new Date();
            end.setHours(23,59,59,999);

            var date = {$gte: start, $lt: end};

            var pageCount = countOcc(art, "<lml-page");
            if (pageCount != 0) {
                pageCount++;
            }

            // Find counts and author object
            db.count(_c, 'content', {author}, function(err, totalCount) {
                db.count(_c, 'content', {author, date}, function(err, totalToday) {
                    db.findUnique(require('./config.js').default(), 'entities', {_id : author}, function(err, author) {
                        var article = {
                            title : art.title,
                            subtitle : art.subtitle,
                            topic,
                            featuredimage : featuredimage.sizes.content.url,
                            score : {
                                ads : countOcc(art, "<ad"),
                                pages : pageCount,
                                paragraphs : countOcc(art, '<p'),
                                images : countOcc(art, '<img')
                            },
                            isSponsored : art.isSponsored,
                            url : _c.server.protocol + _c.server.url + "/" + topic.completeSlug + "/" + art.name,
                        };

                        author = {
                            fullname : author.displayname,
                            avatarURL : author.avatarURL,
                            totalCount,
                            totalToday
                        };

                        sendback({
                            article, author
                        });
                    });
                });
            });
        });
    };

    this.livevar = function(cli, levels, params, callback) {
        var allContent = levels.length === 0;
        if (allContent) {
            if (cli.hasRight('editor')) {
                db.singleLevelFind(cli._c, 'content', callback);
            } else {
                db.findToArray(cli._c, 'content', {author : db.mongoID(cli.userinfo.userid)}, function(err, arr) {
                    callback(arr);
                });
            }
        } else if (levels[0] == "deep") {
            var id = levels[1] && db.mongoID(levels[1]);

            if (id) {
                var match = {_id : id};
                if (!cli.hasRight('editor')) {
                    match.author = db.mongoID(cli.userinfo.userid);
                }

                this.deepFetch(cli._c, id, function(article) {
                    callback(article);
                }, false, match);
            } else {
                callback();
            }
        } else if (levels[0] == "publishreport") {
            var match = { _id : db.mongoID(levels[1]) };
            if (!cli.hasRight('list-articles')) {
                match.author = db.mongoID(cli.userinfo.userid);
            }
            
            this.generatePublishReport(cli._c, match, callback);
        } else if (levels[0] == "all") {
            var sentArr = new Array();

            if (cli.hasRight("list-articles")) {
                db.findToArray(cli._c, 'content', {}, function(err, arr) {
                    for (var i = 0; i < arr.length; i++) {
                        sentArr.push({
                            articleid: arr[i]._id,
                            name: arr[i].name,
                            title: arr[i].title
                        });
                    };

                    callback(sentArr);
                });
            } else {
                callback([]);
            }
        } else if (levels[0] == 'table') {
            if (!cli.hasRight("list-articles")) {
                return callback({size:0,data:[],code:403});
            }

            var sort = {};
            sort[typeof params.sortby !== 'undefined' ? params.sortby : 'date'] = (typeof params.order == "undefined" ? -1 : params.order);
            // sort[typeof params.sortby !== 'undefined' ? '_id' : ''] = (typeof params.order == "undefined" ? -1 : params.order);

            var match = [{status : params.filters.status || {$ne : "destroyed"}}];
            if (params.filters.author) {
                match.push({author : db.mongoID(params.filters.author)});
            }

            if (params.filters.topic) {
                match.push({topic : db.mongoID(params.filters.topic)});
            }

            if (params.filters.isSponsored) {
                var spons = params.filters.isSponsored == "true";
                match.push(spons ? {isSponsored : true} : {isSponsored : {$ne : true}});
            }

            if (!cli.hasRight('editor')) {
                match.push({author: db.mongoID(cli.userinfo.userid)});
            }

            if (params.search) {
                match.push({
                    $text : { $search: '"' + params.search + '"' }
                });
            }

            db.aggregate(cli._c, 'content', [{
                $match: {$and : match}
            }, {
                $sort: sort
            }, {
                $skip : (params.skip || 0)
            }, {
                $limit : (params.max || 20)
            }, {
                $lookup: {
                    from: 'uploads',
                    localField: 'media',
                    foreignField: '_id',
                    as: 'media'
                }
            }, {
                $unwind: {
                    path: "$media",
                    preserveNullAndEmptyArrays: true
                }
            }, {
                $unwind: {
                    path: "$author",
                    preserveNullAndEmptyArrays: true
                }
            }, {
                $project: {
                    author: 1,
                    title: 1,
                    status: 1,
                    subtitle: 1,
                    name: 1,
                    date: 1,
                    media: "$media.sizes.thumbnail.url"
                }
            }], function(data) {
                if (cli._c.content && cli._c.content.cdn && cli._c.content.cdn.domain && data && data.length) {
                    for (var i = 0; i < data.length; i++) if (data[i].media) {
                        data[i].media = data[i].media.replace(cli._c.server.url, cli._c.content.cdn.domain);
                    }
                }

                db.count(cli._c, 'content', {$and : match}, function(err, total) {
                    callback({
                        size: total,
                        data: data
                    });
                });
            });

        } else if (levels[0] == "simple") {
            if (!cli.hasRight('list-articles')) {
                return callback([]);
            }

            db.findToArray(cli._c, 'content', {status : "published"}, function(err, arr) {
                callback(arr);
            }, {_id : 1, title : 1});
        } else if (levels[0] == 'lastEdited') {
            if (!cli.hasRight("list-articles")) {
                return callback({size:0,data:[],code:403});
            }

            db.aggregate(cli._c, 'autosave', [{
                $lookup: {
                    from: 'content',
                    localField: 'contentid',
                    foreignField: '_id',
                    as: 'contentid'
                }
            }, {
                $unwind: {
                    path: '$contentid',
                    preserveNullAndEmptyArrays: true
                }
            }, {
                $project: {
                    title: 1,
                    media: 1,
                    updated: 1,
                    contentid: 1,
                    author: 1,
                    newer: {
                        $cmp: ['$contentid.updated', '$updated']
                    }
                }
            }, {
                $match: {
                    $or: [{
                        contentid: null
                    }, {
                        $and: [{
                            author: db.mongoID(cli.userinfo.userid)
                        }, {
                            newer: {
                                $lt: 0
                            }
                        }]
                    }]
                }
            }, {
                $sort: {
                    date: -1
                }
            }, {
                $limit: 5
            }], function(res) {
                callback(res);

            });
        } else {
            if (!cli.hasRight("list-articles")) {
                return callback({size:0,data:[],code:403});
            }

            // First, check for saved content
            db.aggregate(cli._c, 'content', [
                {
                    $match : {_id: db.mongoID(levels[0])}
                }
            ], function(arr) {
                // Not found, lets check autosaves
                if (arr && arr.length == 0) {
                    db.findToArray(cli._c, 'autosave', {
                        _id: db.mongoID(levels[0])
                    }, function(err, arr) {
                        // Check if there is a newer version than this autosave
                        if (arr && arr.length > 0) {
                            db.findToArray(cli._c, 'content', {
                                _id: db.mongoID(arr[0].contentid),
                                date: {
                                    "$gte": arr[0].date
                                }
                            }, function(err, content) {
                                if (content && content.length > 0) {
                                    arr[0].recentversion = content[0]._id;
                                }

                                db.findToArray(conf.default(), 'entities', {_id : arr[0].author}, function(err, autarr) {
                                    arr[0].authorname = autarr[0].displayname;
                                    arr[0].author = autarr;
                                    callback(arr[0]);
                                });
                            });
                        } else {
                            callback(arr);
                        }

                    });
                } else {

                    // Found a content
                    if (arr && arr.length > 0) {
                        arr[0].authorname = arr[0].author[0] ? arr[0].author[0].displayname : "[NO AUTHOR]";
                        // Check if there is a newer autosaved version
                        db.findToArray(cli._c, 'autosave', {
                            contentid: db.mongoID(arr[0]._id),
                            updated: {
                                "$gte": arr[0].updated
                            }
                        }, function(err, autosave) {
                            if (autosave && autosave.length > 0) {
                                arr[0].recentversion = autosave[0]._id;
                            }
                            db.findToArray(conf.default(), 'entities', {_id : arr[0].author}, function(err, autarr) {
                                arr[0].authorname = autarr[0] ? autarr[0].displayname : "[No Author]";
                                arr[0].author = autarr || {};
                                callback(arr[0]);
                            });
                        });
                    } else {
                        callback([])
                    }

                }
            });
        };
    };

    this.form = function() {
        formBuilder.createForm('post_create', {
                formWrapper: {
                    'tag': 'div',
                    'class': 'row',
                    'id': 'article_new',
                    'inner': true
                },
                fieldWrapper : "lmlform-fieldwrapper"
            })
            .addTemplate('article_base')
            .addTemplate('media-explorer')
            .edit('media', undefined, {
                wrapper: {
                    'class': 'col-md-4'
                }
            })
            .add('topic', 'treeselect', {
                wrapper: {
                    'class': 'col-md-4'
                },
                endpoint: 'topics.all',
                select: {
                    'value': '_id',
                    'displayname': 'displayname',
                    'childrenkey' : 'children'
                },
                displayname: "Topic"
            })
            .add('tags', 'tags', {
                displayname: 'Tags',
                wrapper: {
                    'class': 'col-md-4'
                }
            })
            .trigger('fields')
            .add('title-featuredimage', 'title', {
                displayname : "Featured image information"
            })
            .add('featuredimageartist', 'text', {
                displayname : "Artist name"
            })
            .add('featuredimagelink', 'text', {
                displayname : "Artist link"
            })
/*            .add('title-postleaf', 'title', {
                displayname : "Interactive features"
            })
            .trigger('postleaf')
            .add('title-persona', 'title', {
                displayname : "Persona targeting"
            })
            .trigger('persona')
*/          .add('title-geolocation', 'title', {
                displayname : "Geolocalisation"
            })
            .add('geolocation', 'map', {
                notitle : true,
                format : 'array'
            })
            .add('title-author', 'title', {
                displayname : "Appearance"
            })
            .add('templatename', 'liveselect', {
                endpoint : "themes.templates.article",
                select : {
                    value : 'file',
                    displayname : 'displayname'
                },
                empty : {
                    displayname : " - Use selected topic's template - "
                },
                displayname : "Article template"
            })
            .add('date', 'date', {
                displayname : "Publish date",
                datetime : true,
                context : 'edit'
            }, {
                required : false
            })
            .beginSection('authorbox', {
                show : {
                    "role" : "editor"
                }
            })
            .add('author', 'liveselect', {
                endpoint : "entities.simple",
                displayname : "Author",
                select : {
                    value : "_id",
                    displayname : "displayname",
                    readkey : "0._id"
                }
            })
            .closeSection('authorbox')
            .add('nsfw', 'checkbox', {
                displayname : "Not safe for work (NSFW)"
            })
            .trigger('bottom')
            .add('commtitle', 'title', {
                displayname : "Internal communication"
            })
            .add('communication', 'snip', {
                snip : "communication",
                livevars : ["communications.get.article.{?1}"]
            })
            .add('title-action', 'title', {
                displayname: "Publish"
            })
            .add('publish-set', 'buttonset', { buttons : [{
                    'name' : 'save',
                    'displayname': 'Save article',
                    'type' : 'button',
                    'classes': ['btn-save']
                }, {
                    'name' : 'preview',
                    'displayname': 'Preview',
                    'type' : 'button',
                    'classes': ['btn-preview']
                }, {
                    'name' : 'publish', 
                    'displayname': 'Save and <b>Publish</b>',
                    'type' : 'button',
                    'classes': ['btn-publish', 'role-author']
                }, {
                    'name' : 'send',
                    'displayname' : 'Send for review',
                    'type' : 'button',
                    'classes': ["btn-send-for-review", "role-contributor"]
                }, {
                    'name' : 'refuse',
                    'displayname' : 'Refuse review',
                    'type' : 'button',
                    'classes': ["btn-refuse-review", "role-production"]
                }
            ]}
        );
    }

    this.handleNext = function(cli) {
        var articleName = cli.routeinfo.path[1];
        this.deepFetch(cli._c, articleName, function(deepArticle) {
             if (!deepArticle) {
                db.findToArray(cli._c, 'content', {aliases : articleName}, function(err, arr) {
                    if (err || !arr.length) {
                        cli.throwHTTP(404);
                    } else {
                        cli.routeinfo.path[1] = arr[0].name;
                        handleNext(cli);
                    }
                }, {name : 1});
            } else {
                var extra = {};
                extra.ctx = "next";
                extra.article = deepArticle;
    
                filelogic.renderNextLML(cli, articleName + '.html', extra);
            }
        }, false, {status : "published"});
    };

    this.articleIsPaginated = function(article) {
        return article && article.content && article.content.indexOf("<lml-page>") != -1;
    };

    this.generateArticle = function(_c, aid, cb, alreadyFetched, pageIndex) {
        var workArticle = function(deepArticle) {
            var gen = function() {
                var extra = {};
                extra.ctx = "article";
                extra.article = deepArticle;
                extra.topic = deepArticle.topic;

                if (deepArticle.topic && deepArticle.topic.language) {
                    extra.language = deepArticle.topic.language;
                }

                hooks.fire('article_will_render', {
                    _c : _c,
                    article: deepArticle
                });

                var ctx = deepArticle.templatename || deepArticle.topic.articletemplate || "article";
                var filename = deepArticle.topicslug.substring(1) + deepArticle.name;

                if (that.articleIsPaginated(deepArticle)) {
                    var pages = deepArticle.content.split("<lml-page></lml-page>");

                    if (pageIndex === "all") {
                        log('Article', "Generated paginated article from admin panel : " + deepArticle.title);
                        cIndex = pages.length;

                        var nextPage = function(resp) {
                            if (cIndex == 0) {
                                require('./fileserver.js').deleteFile(_c.server.html + "/" + deepArticle.topic.completeSlug + "/" + deepArticle.name + ".html", function() {
                                    log('Article', "Cleared non-paginated version of article from file system");
                                });

                                cb({
                                    success : true, 
                                    deepArticle : deepArticle,
                                    pages : pages.length
                                });
                            } else {
                                that.generateArticle(_c, deepArticle._id, function(resp) {
                                    cIndex--;
                                    nextPage(resp);
                                }, false, cIndex);
                            }
                        };
                        return nextPage();
                    }

                    if (!pageIndex || pageIndex <= 0) {
                        pageIndex = 1;
                    } else if (pageIndex > pages.length) {
                        pageIndex = pages.length;
                    }

                    if (pageIndex != pages.length) {
                        deepArticle.nextURL = deepArticle.url + "/" + (pageIndex + 1);
                        deepArticle.related = [];
                    } 

                    filename += "/" + pageIndex;
                    deepArticle.content = pages[pageIndex - 1];
                    deepArticle.isPaginated = true;
                    deepArticle.totalPages = pages.length;
                    deepArticle.pageIndex = pageIndex;

                    deepArticle.url += "/" + pageIndex;

                    if (pageIndex != 1) {
                        deepArticle.featuredimage = [];
                        deepArticle.featuredimageartist = undefined;
                        deepArticle.title += " - Page " + pageIndex;
                    }

                    log('Article', "Generated page " + pageIndex + " of paginated article " + deepArticle.title);
                } else {
                    deepArticle.pageIndex = 1;
                }

                var asyncHooks = hooks.getHooksFor('article_async_render_' + _c.uid);
                var aKeys = Object.keys(asyncHooks);
    
                var hookIndex = -1;
                var nextHook = function() {
                    if (++hookIndex != aKeys.length) {
                        var hk = asyncHooks[aKeys[hookIndex]];
                        hk.cb({
                            _c : _c,
                            done : nextHook,
                            article : deepArticle
                        }, 'article_async_render_' + _c.uid)
                    } else {
                        // Generate LML page
                        filelogic.renderThemeLML(_c, ctx, filename + '.html', extra , function(name) {
                            cb && cb({
                                success: true,
                                deepArticle : deepArticle
                            });
                        });
                    }
                };

                nextHook();
            };

            if ((deepArticle.hasads && deepArticle.content && deepArticle.content.indexOf("<ad>") != -1) || deepArticle.nsfw) {
                gen();
            } else {
                that.insertAds(_c, deepArticle, function(content) {
                    deepArticle.content = content || deepArticle.content;
                    gen();
                });
            }
        };

        if (alreadyFetched && typeof aid == "object") {
            workArticle(aid);
        } else {
            that.deepFetch(_c, db.mongoID(aid), workArticle);
        }
    };

    this.generateFromName = function(cli, articleName, cb, onlyPublished, pageIndex) {
        this.deepFetch(cli._c, articleName, function(deepArticle) {
            if (!deepArticle) {
                db.findToArray(cli._c, 'content', {aliases : articleName}, function(err, arr) {
                    if (err || !arr.length) {
                        cb(false);
                    } else {
                        cb(true, {
                            realName : arr[0].name
                        });
                    }
                }, {name : 1});
            } else {
                if (onlyPublished && deepArticle.status !== "published") {
                    cb(false);
                } else {
                    that.generateArticle(cli._c, deepArticle, function(resp) {
                        if (resp.deepArticle.url != cli.routeinfo.url) {
                            cb(true, {
                                realURL : resp.deepArticle.url
                            });
                        } else {
                            cb(true);
                        }
                    }, true, pageIndex);
                }
            }
        }, false, onlyPublished ? {status : "published"} : {});
    }

    this.table = function() {
        tableBuilder.createTable({
            name: 'article',
            endpoint: 'content.table',
            paginate: true,
            searchable: true,
            max_results: 25,
            sortby : 'date',
            filters : {
                status : {
                    displayname : "Status",
                    datasource : [{
                        value : "published",
                        displayname : "Published"
                    }, {
                        value : "draft",
                        displayname : "Draft"
                    }, {
                        value : "reviewing",
                        displayname : "Pending review"
                    }, {
                        value : "deleted",
                        displayname : "Deleted"
                    }],
                }, 
                author : {
                    displayname : "Author",
                    livevar : {
                        endpoint : "entities.simple.active",
                        value : "_id",
                        displayname : "displayname"
                    }
                },
                topic : {
                    displayname : "Topic",
                    livevar : {
                        endpoint : "topics.treename",
                        value : "_id",
                        displayname : "treename"
                    }
                },
                isSponsored : {
                    displayname : "Sponsored Posts",
                    datasource : [{
                        value : false,
                        displayname : "Hide all"
                    }, {
                        value : true,
                        displayname : "Show only"
                    }]
                }
            },
            sortorder : -1,
            fields: [{
                key: 'media',
                displayname: 'Media',
                template: 'imgArticle',
                sortable: false,
                classes : "article-table-image nomobile",
            }, {
                key: '',
                displayname: 'Title - Subtitle',
                template: 'table-article-title',
                sortable: true,
                sortkey: 'title'
            }, {
                key: 'status',
                displayname: 'Status',
                template: 'table-article-status',
                sortable: true,
                classes : "nomobile"
            }, {
                key: 'date',
                displayname: 'Publish date',
                template: 'table-article-date',
                classes : "nomobile",
                sortable: true
            }, {
                key: 'author',
                displayname: 'Author',
                generator : "articleTableGenAuthor",
                classes : "nomobile",
                sortable: true
            }, {
                key: '',
                displayname: 'Actions',
                template: 'table-article-actions',
                sortable: false
            }]
        });

    };
}

module.exports = new Article();
