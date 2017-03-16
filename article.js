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

    this.handlePOST = function(cli) {
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
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;
        }
    };

    this.handleGET = function(cli) {
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

    this.registerContentEndpoint = function() {
        var that = this;
        require('./endpoints.js').register('*', 'next', 'GET', function(cli) { that.handleNext(cli); });
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
                    db.count(cli._c, 'history', {contentid : db.mongoID(cli.routeinfo.path[3])}, function(err, modcount) {
                        cli.sendJSON({
                            status : art.status || "Unknown",
                            url : art.name ? cli._c.server.url + "/" + art.name : "This article doesn't have a URL.",
                            siteurl : cli._c.server.url,
                            aliases : art.aliases ? Array.from(new Set(art.aliases)) : [], 
                            updated : art.updated || "This article was never updated",
                            author : autarr[0] ? autarr[0].displayname : "This article doesn't have an author",
                            modifications : modcount
                        });
                    });
                });
            } else {
                cli.sendJSON({error : "Article not found"});
            }
        });
    };

    this.deepFetch = function(conf, idOrName, cb, preview, extraconds) {
        conf = conf._c || conf;
        var cond = extraconds || new Object();
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
                var titlekeywords = (arr[0].title || art[0].name).replace(/[^a-zA-Z\s]/g, '').split( ' ' ).filter(function ( str ) {
                    var word = str.match(/(\w+)/);
                    return word && word[0].length > 3;
                }).join( ' ' );

                db.rawCollection(conf, preview ? "preview" : 'content', {"strict":true}, function(err, col) {
                    col.aggregate([{
                        // Text query with title, content would be too heavy
                        $match : {
                            _id : {
                                $lt : arr[0]._id
                            }, 
                            $text : { 
                                $search : titlekeywords
                            },
                            $and : [
                                {date : {$gt : new Date(new Date(arr[0].date).getTime() - (1000 * 60 * 60 * 24 * 31 * 6) )}},
                                {date : {$lt : new Date(arr[0].date)}}
                            ],
                            status : "published",
                        }
                    },{
                        // Sort content by what matches the highest
                        $sort : { 
                            score: { 
                                $meta: "textScore" 
                            },
                            date : -1 
                        }
                    },{
                        // Have at most seven related
                        $limit : 5
                    },{
                        // Get featured image 
                        $lookup : {
                            from:           "uploads",
                            localField:     "media",
                            foreignField:   "_id",
                            as:             "featuredimage"
                        }
                    }]).toArray(function(err, relarr) {
                        if (!err) {
                            arr[0].related = relarr;
                        }

                        var continueWorking = function() {
                            db.findToArray(conf, 'categories', {name : {$in : arr[0].categories}}, function(err, catarr) {
                                arr[0].categories = catarr;
                                db.findToArray(require("./config.js").default(), 'entities', {_id : arr[0].author}, function(err, autarr) {
                                    arr[0].authors = autarr;

                                    var evts = hooks.getHooksFor('article_deepfetch');
                                    var keys = Object.keys(evts);
                                    var kIndex = -1;

                                    var next = function() {
                                        kIndex++;

                                        if (kIndex == keys.length) {
                                            hooks.fire('article_will_fetch', {
                                                _c : conf,
                                                article: arr[0]
                                            });
                                        
                                            cb(arr[0]);
                                        } else {
                                            evts[keys[kIndex]].cb(conf, arr[0], next);
                                        }
                                    };

                                    next();
                                });
                            });
                        };

                        if (!relarr || relarr.length == 0) {
                            col.find({_id : {$lt : arr[0]._id}}).sort({_id : -1}).limit(1).next(function(err, rel) {
                                if (!err && rel) {
                                    db.findUnique(conf, 'uploads', {_id : db.mongoID(rel.media)}, function(err, featuredimage) {
                                        rel.featuredimage = featuredimage;
                                        arr[0].related = [rel];
                                    
                                        continueWorking();
                                    });
                                } else {
                                    continueWorking();
                                }
                            });
                        } else {
                            continueWorking();
                        }
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
        if ((article.isSponsored && !force) || (!_c.content || !_c.content.adsperp)) {
            return done(article.content);
        }

        var pcount = _c.content.adsperp;
        var jsdom = require('jsdom');
        var content = article.content ? article.content
            .replace(/\<ad\>\<?\/?a?d?\>?/g, "")
            .replace(/\<lml\:ad\>/g, "")
            .replace(/\<\/lml\:ad\>/g, "")
            .replace(/\<p\>\&nbsp\;\<\/p\>/g, "")
            .replace(/\n/g, "").replace(/\r/g, "")
            .replace(/\<p\>\<\/p\>/g, "") : "";

        var changed = false;
        jsdom.env(content, function(err, dom) {
            if (err) {
                log("Article", "Error parsing dom : " + err, "err");
                return done(article.content);
            }

            var parags = dom.document.querySelectorAll("body > p, body > h3, body > .lml-instagram-embed-wrapper, body > .lml-image-wrapper");
            for (var i = 1; i < parags.length; i++) if (i % pcount == 0) {
                var adtag = dom.document.createElement('ad');
                dom.document.body.insertBefore(adtag, parags[i]);
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
            //var form = formBuilder.handleRequest(cli);
            //var response = formBuilder.validate(form, true);
            var oldSlug = "";

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
                formData.updated = new Date();
                hooks.fire('article_will_' + pubCtx, {
                    cli: cli,
                    article: formData
                });

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
                                                    fileserver.deleteFile(_c.server.html + "/" + oldSlug + ".html", function() {});
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
                                                cli.sendJSON(resp);
                                                var deepArticle = resp.dbdata;

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
            
                                                var nlen = publishedNotificationTitles.length;
                                                var notifMessage = publishedNotificationTitles[Math.floor(nlen / Math.random()) % nlen];
        
                                                notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                                    title: notifMessage,
                                                    url: cli._c.server.url + '/' + deepArticle.name,
                                                    msg: '<i>'+deepArticle.title+'</i> has been published. Click here to see it live.',
                                                    type: 'success'
                                                });

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
 
                                                badges.check(cli, 'publish', function(acquired, level) {});
                                            });
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
        formData.date = new Date(dates.toTimezone(formData.date !== '' ? formData.date : new Date(), cli._c.timezone));

        if (formData.tags && formData.tags.map) {
            formData.tagslugs = formData.tags.map(function(tagname) {
                return slugify(tagname).toLowerCase();
            });
        }

        var maybecat = formData.categories;
        if (maybecat && maybecat[0]) {
            db.update(cli._c, 'categories', {name : maybecat[0]}, {lastused : new Date()}, function() {});
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
   
                                var extra = new Object();
                                extra.article = deepArticle;
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


    this.registerContentLiveVar = function() {
        livevars.registerLiveVariable('content', function(cli, levels, params, callback) {
            var allContent = levels.length === 0;
            if (allContent) {
                if (cli.hasRight('editor')) {
                    db.singleLevelFind(cli._c, 'content', callback);
                } else {
                    db.findToArray(cli._c, 'content', {author : db.mongoID(cli.userinfo.userid)}, function(err, arr) {
                        callback(arr);
                    });
                }
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
                    match.push({author : params.filters.author});
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
                        $text : { $search: params.search }
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
            }
        });

        livevars.registerLiveVariable('types', function(cli, levels, params, callback) {
            if (cli.hasRight("list-articles")) {
                return callback({size:0,data:[],code:403});
            }

            var allTypes = levels.length === 0;

            if (allTypes) {
                db.singleLevelFind(cli._c, 'types', callback);
            } else {
                db.multiLevelFind(cli._c, 'types', levels, {
                    name: levels[0]
                }, {}, callback);
            }
        }, ["types"]);
    }

    this.registerForms = function() {
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
                endpoint: 'topics',
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
            .add('title-postleaf', 'title', {
                displayname : "Interactive features"
            })
            .trigger('postleaf')
            .add('title-persona', 'title', {
                displayname : "Persona targeting"
            })
            .trigger('persona')
/*
            .add('title-industry', 'title', {
                displayname : "Industry"
            })
            .add('industry', 'select', {
                displayname : "Industry Tag",
                datasource: [
                    {name : "realestate", displayName : "Real Estate"},
                    {name : "employment", displayName : "Employment"},
                    {name : "foodresto", displayName : "Food + Restaurants"},
                    {name : "nightlife", displayName : "Nightlife"},
                    {name : "hnf", displayName : "Health + Fitness"},
                    {name : "travel", displayName : "Travel"},
                    {name : "lodging", displayName : "Lodging"},
                    {name : "transportation", displayName : "Transportation"},
                    {name : "fashion", displayName : "Fashion"},
                    {name : "technology", displayName : "Technology"},
                    {name : "education", displayName : "Education"},
                    {name : "finance", displayName : "Finance"},
                    {name : "relationships", displayName : "Relationships + Sex"},
                    {name : "entertainment", displayName : "Entertainment + Tourism"},
                    {name : "info", displayName : "Info"},
                    {name : "sponsorship", displayName : "Sponsorship"}
                ]
            })
*/
            .add('title-geolocation', 'title', {
                displayname : "Geolocalisation"
            })
            .add('geolocation', 'map', {
                notitle : true,
                format : 'array'
            })
            .add('title-author', 'title', {
                displayname : "Redaction"
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
            .trigger('bottom')
            .add('commtitle', 'title', {
                displayname : "Communication"
            })
            /*.add('communication', 'snip', {
                snip : "communication",
                livevars : ["communications.get.article.{?1}"]
            })*/
            .add('title-action', 'title', {
                displayname: "Publish"
            })
            .add('publish-set', 'buttonset', { buttons : [{
                    'name' : 'save',
                    'displayname': 'Save article',
                    'type' : 'button',
                    'classes': ['btn', 'btn-default', 'btn-save']
                }, {
                    'name' : 'preview',
                    'displayname': 'Preview',
                    'type' : 'button',
                    'classes': ['btn', 'btn-default', 'btn-preview']
                }, {
                    'name' : 'publish', 
                    'displayname': 'Save and <b>Publish</b>',
                    'type' : 'button',
                    'classes': ['btn', 'btn-default', 'btn-publish', 'role-author']
                }, {
                    'name' : 'send',
                    'displayname' : 'Send for review',
                    'type' : 'button',
                    'classes': ["btn", "btn-default", "btn-send-for-review", "role-contributor"]
                }, {
                    'name' : 'refuse',
                    'displayname' : 'Refuse review',
                    'type' : 'button',
                    'classes': ["btn", "btn-default", "btn-refuse-review", "role-production"]
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
                var extra = new Object();
                extra.ctx = "next";
                extra.article = deepArticle;
    
                filelogic.renderNextLML(cli, articleName + '.html', extra);
            }
        }, false, {status : "published"});
    };

    this.generateArticle = function(_c, aid, cb, alreadyFetched) {
        var workArticle = function(deepArticle) {
            var gen = function() {
                var extra = new Object();
                extra.ctx = "article";
                extra.article = deepArticle;

                hooks.fire('article_will_render', {
                    _c : _c,
                    article: deepArticle
                });

                // Generate LML page
                filelogic.renderThemeLML(_c, "article", deepArticle.name + '.html', extra , function(name) {
                    cb && cb({
                        success: true,
                        dbdata : deepArticle
                    });
                });
            };

            if (deepArticle.hasads) {
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


    this.generateFromName = function(cli, articleName, cb, onlyPublished, ctx) {
        // Check for articles in db
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
                    that.generateArticle(cli._c, deepArticle, function() {
                        cb(true);
                    }, true);
                }
            }
        }, false, onlyPublished ? {status : "published"} : {});
    }

    var init = function() {
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
                        endpoint : "entities.simple",
                        value : "_id",
                        displayname : "displayname"
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

    init();
}

module.exports = new Article();
