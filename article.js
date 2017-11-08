const filelogic = require('./filelogic.js');
const formBuilder = require('./formBuilder.js');
const conf = require('./config.js');
const db = require('./includes/db.js');
const mongo = require('mongodb');
const livevars = require('./livevars.js');
const fs = require('./fileserver.js');
const notifications = require('./notifications.js');
const slugify = require('slug');
const tableBuilder = require('./tableBuilder.js');
const hooks = require('./hooks.js');
const dates = require('./dates.js');
const badges = require('./badges.js');
const moment = require('moment');
const log = require('./log.js');
const feed = require('./feed.js');
const CDN = require('./cdn.js');
const noop = require('./noop.js');

const publishedNotificationTitles = [
    "You got this!",
    "Allllright!",
    "Look at you!",
    "Yes, you did!",
    "You're simply great!",
    "Annnd it's live!",
    "You're the real deal!",
    "Guess what!",
    "The MVP; that's you!",
    "YASSSSS",
    "Good news!",
    "You. Are. Amazing.",
    "Current state : AWESOME.",
    "Let's celebrate!",
    "Hooray!"
];

const countOcc = (article, occ) => {
    var content = article.content || article || [""];
    var total = 0;

    content.forEach(x => {
        var i = 0;
        do {
            total++;
            i = x.indexOf(occ, i) + 1;
        } while (i != 0)
    });

    return total;
};


class Article {
    adminPOST(cli) {
        cli.touch('article.handlePOST');
        switch (cli.routeinfo.path[2]) {
            case 'new': if (cli.hasRightOrRefuse("create-articles")) this.create(cli); break;
            case 'edit': if (cli.hasRightOrRefuse("publish-articles")) this.publish(cli, "create"); break;
            case 'rebuild': if (cli.hasRightOrRefuse("publish-articles")) this.rebuild(cli); break;
            case 'delete': if (cli.hasRightOrRefuse("publish-articles")) this.delete(cli); break;
            case 'delete-autosave': if (cli.hasRightOrRefuse("create-articles")) this.deleteAutosave(cli); break;
            case 'autosave': if (cli.hasRightOrRefuse("create-articles")) this.save(cli, true); break;
            case 'save': if (cli.hasRightOrRefuse("create-articles")) this.save(cli); break;
            case 'haseditrights': if (cli.hasRightOrRefuse("create-articles")) this.haseditrights(cli); break;
            case 'liveedit': if (cli.hasRightOrRefuse("create-articles")) this.liveedit(cli); break;
            case 'package': if (cli.hasRightOrRefuse("create-articles")) this.packageArticle(cli); break;
            case 'addwordtodico': if (cli.hasRightOrRefuse('create-articles')) this.addWordToDico(cli); break;
            case 'sendforreview': if (cli.hasRightOrRefuse("contributor")) this.sendForReview(cli); break;
            case 'refusereview': if (cli.hasRightOrRefuse("production")) this.refuseReview(cli); break;
            case 'preview': if (cli.hasRightOrRefuse("list-articles")) this.publish(cli, "preview"); break;
            case 'destroy': if (cli.hasRightOrRefuse("destroy-articles")) this.delete(cli, true); break;
            case 'addfeature': if (cli.hasRightOrRefuse("create-articles")) this.addFeature(cli); break;
            case 'editslug': if (cli.hasRightOrRefuse("create-articles")) this.editSlug(cli); break;
            case 'removealias': if (cli.hasRightOrRefuse("publish-articles")) this.maybeRemoveAlias(cli); break;
            default: return cli.throwHTTP(404, 'Not Found');
        }
    };

    adminGET(cli) {
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

    toPresentables(_c, articles) {
        return articles.map(x => this.toPresentable(_c, x, true));
    };

    toPresentable(_c, article, stripContent) {
        var featuredimages = {};
        if (article.featuredimage && article.featuredimage[0]) {
            for (var size in article.featuredimage[0].sizes) {
                featuredimages[size] = CDN.parseOne(_c, article.featuredimage[0].sizes[size].url);
            }
        }

        var topic;
        if (article.topic) {
            topic = {
                id : article.topic._id,
                displayname : article.topic.displayname,
                slug : article.topic.slug,
                completeSlug : article.topic.completeSlug
            }
        }

        var author;
        if (article.authors && article.authors[0]) {
            author = article.authors[0];
            author = {
                id : author._id,
                displayname : author.displayname,
                bio : author.description,
                avatarURL : author.avatarURL,
                avatarMini : author.avatarMini,
                slug : author.slug
            };
        }

        return {
            id : article._id.toString(),
            title : article.title,
            subtitle : article.subtitle,
            featuredimageartist : article.featuredimageartist,
            featuredimagelink : article.featuredimagelink,
            geolocation : article.geolocation && article.geolocation.split('_'),
            date : article.date,
            isPaginated : article.content.length > 1,
            totalPages : article.content.length,
            isSponsored : article.isSponsored,
            useSponsoredBox : article.useSponsoredBox,
            sponsoredBoxTitle : article.sponsoredBoxTitle,
            sponsoredBoxURL : article.sponsoredBoxURL,
            sponsoredBoxLogo : article.sponsoredBoxLogo,
            sponsoredBoxContent : article.sponsoredBoxContent,
            slug : article.name,
            nsfw : article.nsfw,
            url : article.url,

            content : (stripContent ? undefined : article.content),

            author, topic, featuredimages
        };
    }

    apiPOST(cli) {
        if (cli.routeinfo.path[2] == "save") {
            cli.readPostData(data => {
                if (!data._id) {
                    log('API', 'Article.save, no ID provided', 'warn');
                    return cli.throwHTTP(404, undefined, true);
                }

                const selector = { _id : db.mongoID(data._id) };
                if (!cli.hasAPIRight('editor')) {
                    selector.author = db.mongoID(cli.apisession.userid);
                }

                const values = {
                    title : data.title,
                    status : data.status
                };

                if (cli.routeinfo.path[3] == "full") {
                    values.content = data.content;
                    values.subtitle = data.subtitle;
                    values.name = data.name;
                }

                db.update(cli._c, 'content', selector, values, (err, r) => {
                    if (values.status == "published" && r.matchedCount !== 0) {
                        this.generateArticle(cli._c, db.mongoID(data._id), () => {
                            cli.sendJSON({saved : true, published : true});
                        }, false, "all") ;
                    } else if (!!r.matchedCount) {
                        cli.sendJSON({saved : true});
                    } else {
                        log('API', 'Article.save, no document found for selector : ' + JSON.stringify(selector), 'warn');
                        cli.throwHTTP(404, undefined, true);
                    }
                }, false, true);
            });
        } else {
            log('API', 'Article, Invalid route ' + cli.routeinfo.path.join('/'), 'warn');
            return cli.throwHTTP(404, undefined, true);
        }
    }

    apiGET(cli) {
        var ftc = cli.routeinfo.path[2];
        if (ftc == "get") {
            var slug = cli.routeinfo.path[3];
            that.deepFetch(cli._c, slug, (article)  => {
                if (!article) {
                    cli.throwHTTP(404);
                } else {
                    cli.sendJSON(
                        that.toPresentable(cli._c, article)
                    );
                }
            }, false, {status : "published"});
        } else if (ftc == "foredit" && cli.hasAPIRight('list-content')) {
            if (!cli.routeinfo.path[3] || !cli.routeinfo.path[3].trim()) {
                return cli.throwHTTP(404);
            }

            const conditions = {};
            if (!cli.hasAPIRight('editor')) {
                conditions.author = db.mongoID(cli.apisession.userid);
            }

            this.deepFetch(cli._c, db.mongoID(cli.routeinfo.path[3]), (art) => {
                if (art) {
                    cli.sendJSON(art);
                } else {
                    cli.throwHTTP(404, undefined, true);
                }
            }, false, conditions);
        } else if (ftc == "list" && cli.hasAPIRight('list-content')) {
            const postlimit = 100;
            const conditions = {};
            if (!cli.hasAPIRight('admin')) {
                conditions.status = {$ne : "destroyed"};
            }

            db.find(cli._c, 'content', conditions, [], (err, cursor) => {
                cursor
                .limit(postlimit)
                .skip(cli.routeinfo.params.page ? (cli.routeinfo.params.page * postlimit) : 0)
                .project({
                    title : 1, subtitle : 1, status : 1, author : 1, date : 1
                })
                .sort({_id : -1})
                .toArray((err, arr) => {
                    cli.sendJSON(arr);
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    };

    query(cli, opts, cb) {
        db.paramQuery(cli, opts, cb);
    };

    list(cli) {
        filelogic.serveAdminLML(cli, false);
    };

    haseditrights(cli) {
        if (cli.hasRight('editor')) {
            cli.sendJSON({ edit : true, read : true });
        } else {
            db.findUnique(cli._c, 'content', { _id : db.mongoID(cli.routeinfo.path[3]) }, (err, article) => {
                if (cli.userinfo.userid == article.author) {
                    cli.sendJSON({ edit : true, read : true });
                } else {
                    cli.sendJSON({ edit : false, read : true });
                }
            });
        }
    };

    liveedit(cli) {
        const postdata = cli.postdata.data;
        let index = parseInt(postdata.page || 1) - 1;

        db.findUnique(cli._c, 'content', { _id : db.mongoID(cli.routeinfo.path[3]) }, (err, article) => {
            if (article && (cli.userinfo.userid == article.author || cli.hasRight('editor'))) {
                article.content[index] = postdata.markup || article.content[index];
                article.title[index] = postdata.title;
                article.subtitle[index] = postdata.subtitle;

                db.update(cli._c, 'content', { _id : db.mongoID(cli.routeinfo.path[3]) }, article, (err, r) => {
                    require("./history.js").pushModification(cli, article, article._id, (err, revision)  => {    
                        this.generateArticle(cli._c, db.mongoID(cli.routeinfo.path[3]), resp => {
                            cli.sendJSON({
                                ok : 1
                            });
                        }, false, index + 1);
                    });
                });
            } else {
                cli.throwHTTP(404, undefined, true);
            }
        });
    };

    addWordToDico(cli) {
        const Proofreader = require('./proofreader');
        Proofreader.addWord(cli.postdata.data.word, cli.postdata.data.lang || "en", () => {
            cli.sendJSON({ok : true});
        });
    };

    packageArticle(cli) {
        const lang = cli.postdata.data.lang;

        db.findUnique(cli._c, 'content', { _id : db.mongoID(cli.routeinfo.path[3]) }, (err, article) => {
            const jsdom = require('jsdom');
            const pages = article.content;
            const contents = [];
            const reports = []; 

            const sendback = () => {
                if (contents.length == article.content.length) {
                    db.update(cli._c, 'content', { _id : article._id }, { content : contents, hasads : true }, () => {
                        cli.sendJSON({ content : contents, report : reports, article });
                    });
                } else {
                    cli.sendJSON({ content : contents, report : reports, article });
                }
            };

            let index = -1;
            const nextpage = () => {
                if (++index == pages.length) {
                    return sendback();
                }

                const page = pages[index];
                const window = new jsdom.JSDOM(page).window;

                const paragraphs = Array.prototype.filter.call(
                    window.document.querySelectorAll('body > p'), 
                    x => !x.textContent.startsWith('@') && !x.textContent.toLowerCase().startsWith('via')
                );

                paragraphs.forEach((x, i) => {
                    x.id = "article-p-" + i
                });

                pages[index] = window.document.body.innerHTML;

                this.proofread(paragraphs, lang, report => {
                    reports.push(report);

                    if (article.hasads || article.isSponsored || article.nsfw) {
                        contents.push(pages[index]);
                        nextpage();
                    } else {
                        this.insertAds(cli._c, article._id, pages[index], content => {
                            contents.push(content);
                            nextpage();
                        });
                    }
                });
            };

            nextpage();
        }, {content : 1, title : 1, subtitle : 1, facebooktitle : 1, facebooksubtitle : 1, isSponsored : 1, nsfw : 1, hasads : 1});
    }

    proofread(paragraphs, lang, send) {
        const Proofreader = require('./proofreader');

        Proofreader.proofread(paragraphs.map(x => x.textContent), lang, (report, lang) => {
            send(report && { 
                corrections : report.map(r => r.messages.map(x => { 
                    return { reason : x.message, at : x.column, suggestions : x.expected,  } })
                ),
                keywords : report.map(r => r.data.keywords),
                paragraphs : paragraphs.map(x => x.innerHTML),
                language : lang
            });
        });
    }

    infoStrip(cli) {
        db.findToArray(cli._c, 'content', {_id : db.mongoID(cli.routeinfo.path[3])}, (err, arr)  => {
            if (arr.length != 0) {
                var art = arr[0];
                db.findToArray(conf.default(), 'entities', {_id : art.author}, (err, autarr)  => {
                    db.findUnique(cli._c, 'topics', {_id : art.topic}, (err, topic)  => {
                        db.count(cli._c, 'history', {contentid : db.mongoID(cli.routeinfo.path[3])}, (err, modcount)  => {
                            db.findToArray(cli._c, 'socialdispatch', { 
                                postid : db.mongoID(cli.routeinfo.path[3]),  
                                status : { $ne : "deleted" }
                            }, (err, socialp) => {
                                cli.sendJSON({
                                    status : art.status || "Unknown",
                                    url : art.name ? 
                                        (cli._c.server.url + "/" + (art.topic ? topic.completeSlug : "") + "/" + art.name) : 
                                        "This article doesn't have a URL.",
                                    siteurl : cli._c.server.url,
                                    name : art.name,
                                    shares : art.shares,
                                    aliases : art.aliases ? Array.from(new Set(art.aliases)) : [],
                                    updated : art.updated || "This article was never updated",
                                    author : autarr[0] ? autarr[0].displayname : "This article doesn't have an author",
                                    modifications : modcount,
                                    socialdispatch : socialp
                                });
                            });
                        });
                    });
                });
            } else {
                cli.sendJSON({error : "Article not found"});
            }
        });
    };

    removeAlias(conf, article, alias, cb) {
        var aliases = article.aliases || [];
        var index = aliases.indexOf(alias);
        if (index != -1) {
            aliases.splice(index, 1);
        }
        
        log('Content', "Removing alias " + alias + " from article " + article.title[0] + " at index " + index);
        db.update(conf, 'content', {_id : article._id}, {aliases : aliases}, cb || noop);
    };

    maybeRemoveAlias(cli) {
        var cond = {
            _id : db.mongoID(cli.postdata.data.articleid)
        };

        if (!cli.hasRight('editor')) {
            cond.author = db.mongoID(cli.userdata.userid);
        }

        db.findUnique(cli._c, 'content', cond, (err, article)  => {
            if (err || !article) {
                cli.sendJSON({error : "Missing rights or article not found"});
            } else {
                that.removeAlias(cli._c, article, cli.postdata.data.alias, ()  => {
                    cli.sendJSON({error : false, success : true});
                });
            }
        });
    };

    batchFetch(conf, idsOrNames, cb, conditions) {
        var i = -1;
        var deepArticles = [];
        var next = ()  => {
            if (++i == idsOrNames.length) {
                cb(deepArticles);
            } else {
                that.deepFetch(conf, idsOrNames[i], (art)  => {
                    deepArticles.push(art);
                    next();
                });
            }
        };

        next();
    };

    deepFetch(conf, idOrName, cb, preview, extraconds) {
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
        ], (arr)  => {
            if (arr.length === 0) {
                cb(false, new Error("No article found"));
            } else {
                var article = arr[0];
                db.rawCollection(conf, preview ? "preview" : 'content', {"strict":true}, (err, col)  => {
                    col.aggregate([{
                        $match : {
                            _id : {
                                $lt : article._id
                            }, 
                            topic : article.topic,
                            status : "published",
                        }
                    },{
                        $sort : { 
                            date : -1 
                        }
                    },{
                        $limit : 1
                    },{
                        $lookup : {
                            from:           "uploads",
                            localField:     "media",
                            foreignField:   "_id",
                            as:             "featuredimage"
                        }
                    }]).next((err, related)  => {
                        var continueWorking = ()  => {
                            var continueWithAuthor = ()  => {
                                db.findToArray(require("./config.js").default(), 'entities', {_id : article.author}, (err, autarr)  => {
                                    article.authors = autarr;

                                    var evts = hooks.getHooksFor('article_deepfetch');
                                    var keys = Object.keys(evts);
                                    var kIndex = -1;

                                    var next = ()  => {
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
                            
                            require('./topics.js').deepFetch(conf, article.topic, (deepTopic, family)  => {
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

                                if (article.content && article.content.includes('<lml-page')) {
                                    article.paginated = true;
                                }

                                if (article.related) {
                                    article.related.url = conf.server.protocol + conf.server.url + article.topicslug + related.name;
                                }

                                continueWithAuthor();
                            });
                        };

                        article.images = article.featuredimage[0];
                        article.imageurls = {};
                        if (article.images) {
                            for (var size in article.images.sizes) {
                                article.imageurls[size] = conf.server.protocol + article.images.sizes[size].url;
                            }
                            article.imagecreditname = article.images.artistname;
                            article.imagecrediturl  = article.images.artisturl;
                        }
                        article.related = related;
                        continueWorking();
                    });
                });
            }
        });
    };

    refreshTagSlugs(_c, cb) {
        db.find(_c, 'content', {}, [], (err, cursor)  => {
            var handleNext = ()  => {
                cursor.hasNext((err, hasnext)  => {
                    if (hasnext) {
                        cursor.next((err, dbart)  => {
                            var tagslugs = dbart.tags.map((tagname)  => {
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

    sendForReview(cli) {
        var cid = cli.routeinfo.path[3];
        var conds = {
            _id : db.mongoID(cid)
        };

        db.findUnique(cli._c, 'content', conds, (err, article)  => {
            if (cli.hasRight('editor') || cli.userinfo.userid == article.author.toString()) {
                db.update(cli._c, 'content', conds, {status : "reviewing"}, ()  => {
                    cli.sendJSON({changed : true});
                });

                db.findUnique(require('./config.js').default(), 'entities', 
                    {_id : db.mongoID(cli.userinfo.userid)}, 
                    (err, contractor)  => {
                    db.findToArray(require('./config.js').default(), 'entities', {_id : {$in : contractor.reportsto || []}}, (err, reportees)   => {
                        for (var i = 0; i < reportees.length; i++) {
                            require('./mail.js').triggerHook(cli._c, 'article_sent_for_review', reportees[i].email, {
                                to : reportees[i],
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

    refuseReview(cli) {
        db.update(cli._c, 'content', {_id : db.mongoID(cli.routeinfo.path[3]), status : "reviewing"}, {status : "draft"}, ()  => {
            cli.sendJSON({success : true});
        });
    };

    addFeature(cli) {
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
        }, () => {
            log('Content', 'Added feature "' + featurename + '" to article with id ' + cli.routeinfo.path[3]);
            cli.sendJSON({done : true});
        });
    };

    insertAds(_c, articleid, content, done, force) {
        var asyncHooks = hooks.getHooksFor('insert_ads_' + _c.uid);
        var aKeys = Object.keys(asyncHooks);
        var aIndex = -1;

        var nextHook = (newctn)  => {
            content = newctn || content;

            if (++aIndex == aKeys.length) {
                done(content);
            } else {
                asyncHooks[aKeys[aIndex]].cb({
                    _c, content, done : nextHook
                }, 'insert_ads_' + _c.uid);
            }
        };
        nextHook(content);
    };

    updateActionStats(_c, deepArticle, callback, reduce) {
        db.findUnique(_c, 'content', {_id : deepArticle._id || deepArticle}, (err, article) => {
            var stats = {
                $inc : {
                    p   : countOcc(article, '</p>') * (reduce ? -1 : 1),
                    img : countOcc(article, '<img') * (reduce ? -1 : 1),
                    ad  : countOcc(article, '<ad>') * (reduce ? -1 : 1)
                }
            };
            var entity = db.mongoID(deepArticle.author);

            db.update(conf.default(), 'actionstats', {entity, type : "article_content"}, stats, (err, r)  => {
                callback && callback(r.value);
            }, true, true, true, true);
        });
    };

    create(cli) {
        cli.touch('article.create');
        var articleObject = {};

        articleObject.title = [cli.postdata.data.title];
        articleObject.subtitle = [""] 
        articleObject.author = db.mongoID(cli.userinfo.userid);
        articleObject.updated = new Date();
        articleObject.createdOn = new Date();
        articleObject.status = "draft";
        articleObject.type = "post";
        articleObject.content = [""];
        articleObject.createdBy = db.mongoID(cli.userinfo.userid);
        articleObject.subscribers = [articleObject.createdBy];

        var commitToCreate = ()  => {
            db.insert(cli._c, 'content', articleObject, (err, result)  => {
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
            db.find(conf.default(), 'entities', { _id : db.mongoID(cli.userinfo.userid) }, [], (err, cursor) => {
                cursor.limit(1).project({reportsto : 1}).next((err, u) => {
                    u.reportsto && u.reportsto.length != 0 && articleObject.subscribers.push(...u.reportsto);
        
                    commitToCreate();
                });
            });
        } else {
            commitToCreate();
        }
    };

    facebookDebug(cli, postid) {
        db.findUnique(cli._c, 'content', {_id : postid}, (err, article) => {
            if (cli._c.social.facebook.appid && cli._c.social.facebook.token) {
                log('Facebook', 'Sending request to debug link');
                require('request')({
                    url : 'https://graph.facebook.com/v' + cli._c.social.facebook.apiversion || "2.8",
                    body : {
                        scrape : true,
                        access_token : cli._c.social.facebook.token,
                        id : cli._c.server.protocol + cli._c.server.url + "/" + article.name
                    },
                    json : true,
                    method : "POST"
                }, (a, b, c)  => {
                    if (c && c.title) {
                        log('Facebook', 'Debugger responded with title', "success");
                        notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                            title: "Facebook Graph",
                            msg: '<i>'+article.title[0]+'</i> has been debugged on Facebook Graph.',
                            type: 'log'
                        });
                    } else {
                        log('Facebook', 'Debugger responded with error', "warn");
                        notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                            title: "Facebook Graph",
                            url : "https://developers.facebook.com/tools/debug/og/object/",
                            msg: '<i>'+article.title[0]+'</i> was not debugged on Facebook Graph.',
                            type: 'warning'
                        });
                    }
                });
            }
        });
 
    }

    rebuild(cli) {
        cli.touch('article.rebuild');
        const postid = db.mongoID(cli.routeinfo.path[3]);

        const goOn = () => {
            that.generateArticle(cli._c, postid, (resp)  => {
                cli.throwHTTP(201, undefined, true);
                that.facebookDebug(cli, postid);
            }, false, 'all');
        };

        if (cli.hasRight('editor')) {
            goOn();
        } else {
            db.findUnique(cli._c, 'content', {_id : postid}, (err, article) => {
                if (article && article.author && article.author.toString() == cli.userinfo.userid) {
                    goOn();
                } else {
                    cli.throwHTTP(404, undefined, true);
                }
            });
        }
    };
    
    publish(cli, pubCtx) {
        cli.touch('article.new');
        pubCtx = pubCtx || "create";

        var dbCol = {
            "create" : "content",
            "preview" : "preview"
        }

        if (pubCtx == "publish" && !cli.hasRight('publish-articles')) {
            return cli.throwHTTP(403, undefined, true);
        }

        if (!cli.postdata.data.id) {
            // No post id provided
            notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                title: "How should I put this...",
                msg: 'I could not publish this article because no identifier was provided. No data was lost during the process. I invite you to try again.',
                type: 'danger'
            });
            
            return cli.throwHTTP(400, undefined, true);
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
                    formData.name = slugify(formData.title[0]).toLowerCase();
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
                    _id: db.mongoID(cli.postdata.data.id)
                }; 

                if (formData.tags && formData.tags.map) {
                    formData.tagslugs = formData.tags.map((tagname)  => {
                        return slugify(tagname).toLowerCase();
                    });
                } else {
                    formData.tags = [];
                    formData.tagslugs = [];
                }

                log('Article', 'Saving published post in database', 'info');
                db.findToArray(cli._c, 'content', conds, (err, arr)  => {
                    var nUpdate = ()  => {
                        db.update(cli._c, dbCol[pubCtx], conds, formData, (err, result)  => {
                            if (!err) {
                                var postUpdate = ()  => {
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
                                        cli.did('content', 'published', {title : cli.postdata.data.title[0]});

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
                                                ()  => {
                                                    log('Article', 'Added alias for slug ' + oldSlug);
                                                    fileserver.deleteFile(cli._c.server.html + "/" + oldSlug + ".html", ()  => {});
                                                }, false, true, true);
                                            }

                                            db.update(cli._c, 'content', 
                                                {_id : db.mongoID(formData._id)}, 
                                                {$addToSet : {subscribers : {$each : [
                                                    db.mongoID(cli.userinfo.userid),
                                                    formData.author
                                                ]}}}, 
                                                ()  => {}, false, true, true
                                            );

                                            that.generateArticle(cli._c, db.mongoID(formData._id), (resp)  => {
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
                                                        ()  => {}
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
                                                    }, (a, b, c)  => {
                                                        if (c && c.title) {
                                                            log('Facebook', 'Debugger responded with title', "success");
                                                            notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                                                title: "Facebook Graph",
                                                                msg: '<i>'+deepArticle.title[0]+'</i> has been debugged on Facebook Graph.',
                                                                type: 'log'
                                                            });
                                                        } else {
                                                            log('Facebook', 'Debugger responded with error', "warn");
                                                            notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                                                title: "Facebook Graph",
                                                                url : "https://developers.facebook.com/tools/debug/og/object/",
                                                                msg: '<i>'+deepArticle.title[0]+'</i> was not debugged on Facebook Graph.',
                                                                type: 'warning'
                                                            });
                                                        }
                                                    });
                                                }
            
                                                var maybeTopic = formData.topic && db.mongoID(formData.topic);
                                                db.findUnique(cli._c, 'topics', { _id : maybeTopic  }, (err, tObject)  => {
                                                    var nlen = publishedNotificationTitles.length;
                                                    var notifMessage = publishedNotificationTitles[Math.floor(nlen / Math.random()) % nlen];
                                                    notifications.notifyUser(cli.userinfo.userid, cli._c.id, {
                                                        title: notifMessage,
                                                        url: cli._c.server.url + (tObject ? ("/" + tObject.completeSlug) : "") + '/' + deepArticle.name,
                                                        msg: (deepArticle.isPaginated ? "Paginated article " : "Article ") + '<i>'+deepArticle.title[0]+'</i> has been published. Click here to see it live.',
                                                        type: 'success'
                                                    });

                                                    tObject && require('./topics.js').deepFetch(
                                                        cli._c, 
                                                        maybeTopic, 
                                                    (topic, parents)  => {
                                                        parents.forEach((sTopic)  => {
                                                            hooks.fire('rss_needs_refresh_' + cli._c.uid, {
                                                               _c : cli._c,
                                                                completeSlug : sTopic.completeSlug,
                                                                callback : ()  => {
                                                                    log('Article', "RSS feed was refresh, received callback");
                                                                }
                                                            });
                                                        });
                                                    });
                                                });

                                                if (wasNotPublished) {
                                                    that.updateActionStats(cli._c, deepArticle, (values)  => {
                                                        hooks.fire('article_published_from_draft', {
                                                            article: deepArticle,
                                                            score : values,
                                                            _c : cli._c
                                                        });
                                                    });
                                                }

                                                feed.plop(deepArticle._id, ()  => {
                                                    feed.push(deepArticle._id, cli.userinfo.userid, 'published', cli._c.id, {
                                                        title : deepArticle.title[0],
                                                        subtitle : deepArticle.subtitle,
                                                        slug : deepArticle.name,
                                                        image : deepArticle.featuredimage[0].sizes.thumbnaillarge.url,
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
                                            that.deepFetch(cli._c, db.mongoID(formData._id), (deepArticle)  => {
                                                var extra = {};
                                                extra.ctx = "article";
                                                extra.article = deepArticle;
                                                extra.topic = deepArticle.topic;
                                                extra.preview = true;

                                                var content = deepArticle.content.shift();
                                                deepArticle.content.forEach((x, i) => {
                                                    content += '<hr /><h1 class="preview-page-break">'+deepArticle.title[i+1]+"</h1>"
                                                    content += x;
                                                });

                                                deepArticle.content  = content;
                                                deepArticle.title    = deepArticle.title && deepArticle.title[0];
                                                deepArticle.subtitle = deepArticle.subtitle && deepArticle.subtitle[0];

                                                log('Preview', 'Rendering HTML for previewed post');
                                                filelogic.renderThemeLML(cli._c, "article", tmpName, extra, ()  => {
                                                    log('Preview', 'Sending preview file before deletion : ' + absPath);
                                                    var fileserver = require('./fileserver.js');
                                                    fileserver.pipeFileToClient(cli, absPath, ()  => {
                                                        fileserver.deleteFile(absPath, ()  => {});
                                                    }, true);
                                                });

                                                db.update(conf.default(), "actionstats", {
                                                    entity : db.mongoID(cli.userinfo.userid), 
                                                    type : "system"
                                                }, {
                                                    $inc : {preview : 1}
                                                }, (err, r) => {
                                                    hooks.fire("article_previewed", {
                                                        entity : db.mongoID(cli.userinfo.userid),
                                                        _c : cli._c,
                                                        article : deepArticle,
                                                        score : r.value ? r.value.preview : 1
                                                    });
                                                }, true, true, true, true);
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
                        }, pubCtx == "preview", true);
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
    save(cli, auto) {
        // Article already exists
        cli.postdata.data.form_name = "post_create";

        //var form = formBuilder.handleRequest(cli);
        var formData = cli.postdata.data; // formBuilder.serializeForm(form);
        var id;

        if (cli.postdata.data.autosaveid) {
            db.remove(cli._c, 'autosave', {
                _id: db.mongoID(cli.postdata.data.autosaveid.replace(" ", ""))
            }, ()  => {});
        }

        formData.author = formData.author ? db.mongoID(formData.author) : db.mongoID(cli.userinfo.userid);
        formData.updated = new Date();
        formData.date = formData.date ? new Date(dates.toTimezone(formData.date !== '' ? formData.date : new Date(), cli._c.timezone)) : undefined;

        if (formData.topic) {
            formData.topic = db.mongoID(formData.topic);
        }

        if (formData.tags && formData.tags.map) {
            formData.tagslugs = formData.tags.map((tagname)  => {
                return slugify(tagname).toLowerCase();
            });
        }

        if (!formData.date) {
            delete formData.date;
        }

        log('Article', 'Preparing to save article ' + formData.title[0]);
        // Autosave
        if (auto) {
            // Check if article is edit, non-existing or published
            formData._id = undefined;
            if (cli.postdata.data.contentid) {
                db.update(cli._c, 'content', {
                    _id: db.mongoID(cli.postdata.data.contentid),
                    status : {$ne : "published"}
                }, formData, (err, docs)  => {
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
                }, (err, ress)  => {
                    var res = err ? undefined : ress[0];
                    if (!err && (res.author.toString() == cli.userinfo.userid.toString() || cli.hasRight('editor'))) {
                        log('Article', 'Updating content for article ' + formData.title[0]);
                        delete formData._id;

                        if (!res.usefacebooktitle) {
                            formData.facebooktitle = formData.title[0];
                            formData.facebooksubtitle = formData.subtitle[0];
                        }

                        db.update(cli._c, 'content', {
                            _id: id
                        }, formData, (err, doc)  => { 
                            require("./history.js").pushModification(cli, res, res._id, (err, revision)  => {    
                                cli.sendJSON({
                                    success: true,
                                    _id: cli.postdata.data._id,
                                    reason : 200
                                });
                            });
                            db.update(cli._c, 'content', 
                                {_id : id}, {$addToSet : {subscribers : db.mongoID(cli.userinfo.userid)}}, 
                                ()  => {}, false, true, true
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

    preview(cli) {
        this.publish(cli, "preview");
        return;
    };

    edit(cli) {
        var that = this;
        if (cli.routeinfo.path[3]) {

            var id = db.mongoID(cli.routeinfo.path[3]);
            if (cli.method == 'POST') {

                var form = formBuilder.handleRequest(cli);
                var response = formBuilder.validate(form, true);

                if (response.success) {
                    formData = formBuilder.serializeForm(form);

                    if (!cli.postdata.data._keepURL) {
                        formData.name = slugify(formData.title[0]).toLowerCase();
                    }

                    formData.media = db.mongoID(formData.media);
                    formData.updated = new Date();
                    formData.status = 'published';
                    formData.date = new Date(formData.date);

                    if (formData.tags.map) {
                        formData.tagslugs = formData.tags.map((tagname)  => {
                            return slugify(tagname).toLowerCase();
                        });
                    }

                    db.findToArray(cli._c, 'content', {
                        _id: id
                    }, (err, row)  => {
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
                        }, formData, (err, r)  => {
                            that.deepFetch(cli._c, id, (deepArticle)  => {
                                cli.did('content', 'edited', {title : cli.postdata.data.title[0]});
                                
                                hooks.fire('article_edited', {
                                    cli: cli,
                                    article: r.value
                                });
   
                                var extra = {};
                                extra.article = deepArticle;
                                extra.topic = deepArticle.topic;
                                extra.ctx = "article";
 
                                filelogic.renderThemeLML(cli, "article", formData.name + '.html', extra , (name)  => {
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

    editSlug(cli) {
        if (cli.routeinfo.path[3]) {
            var newslug = cli.postdata.data.slug;
            if (!newslug) {
                cli.sendJSON({error : "Missing slug", success : false});
            } else {
                if (/^[a-z0-9\-]+$/.test(newslug)) {
                    var id = db.mongoID(cli.routeinfo.path[3]);
                    db.findUnique(cli._c, 'content', {_id : id}, (err, article)  => {
                        if (cli.hasRight('editor') || article.author.toString() == cli.userinfo.userid.toString()) {
                            var aliases = article.aliases || [];
                            aliases.push(article.name);
                            db.update(cli._c, 'content', {_id : id}, {name : newslug, aliases : aliases}, ()  => {
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

    deleteAutosave(cli) {
        if (cli.routeinfo.path[3]) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            db.remove(cli._c, 'autosave', {
                _id: id
            }, (err, res)  => {
                return cli.sendJSON({
                    redirect: cli._c.server.url + '/admin/article/list',
                    success: true
                });
            });
        }
    }

    delete(cli, destroy) {
        if (cli.routeinfo.path[3]) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            db.findToArray(cli._c, 'content', {
                _id: id
            }, (err, results)  => {
                var result = err ? undefined : results[0];
                if (result) {
                    if (cli.hasRight('editor') || result.author.toString() == cli.userinfo.userid.toString()) {
                        // Can delete the current article
                        hooks.fire('article_will_delete', id);
                        that.updateActionStats(cli._c, result, ()  => {}, true);

                        db.update(cli._c, 'content', {
                            _id: id
                        }, {
                            status: destroy ? 'destroyed' : 'deleted'
                        }, (err, r)  => {
                            cli.did('content', destroy ? 'destroyed' : 'deleted', {id : id});
                            
                            var filename = cli._c.server.html + "/" + result.name + '.html';
                            fs.deleteFile(filename, ()  => {
                                hooks.fire('article_deleted', {id : id, cli : cli, _c : cli._c});
                            });

                            // Remove autosave pointing to article deleted
                            db.remove(cli._c, 'autosave', {
                                contentid: id
                            }, ()  => {
                                require('./history.js').pushModification(cli, result, id, ()  => {
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

    getArticle(cli) {
        var id = new mongo.ObjectID(cli.routeinfo.path[3]);
        db.find(cli._c, 'content', {
            '_id': id
        }, {
            limit: [1]
        }, (err, cursor)  => {
            cursor.next((err, article)  => {
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

    generatePublishReport(_c, $match, sendback) {
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
        ], (arr)  => {
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

            var pageCount = art.content.length;
            var pcount = 0;
            var imgcount = 0;
            var adcount = 0;

            // Find counts and author object
            db.count(_c, 'content', {author}, (err, totalCount)  => {
                db.count(_c, 'content', {author, date}, (err, totalToday)  => {
                    db.findUnique(require('./config.js').default(), 'entities', {_id : author}, (err, author)  => {
                        var article = {
                            title : art.title[0],
                            subtitle : art.subtitle[0],
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
                            avatarMini : author.avatarMini,
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

    livevar(cli, levels, params, callback) {
        var allContent = levels.length === 0;
        if (allContent) {
            if (cli.hasRight('editor')) {
                db.singleLevelFind(cli._c, 'content', callback);
            } else {
                db.findToArray(cli._c, 'content', {author : db.mongoID(cli.userinfo.userid)}, (err, arr)  => {
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

                this.deepFetch(cli._c, id, (article)  => {
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
                db.findToArray(cli._c, 'content', {}, (err, arr)  => {
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
            sort[typeof params.sortby !== 'undefined' ? params.sortby : '_id'] = (typeof params.order == "undefined" ? -1 : params.order);
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
            }], (data)  => {
                var usecdn = cli._c.content && cli._c.content.cdn && cli._c.content.cdn.domain && data && data.length; 
                for (var i = 0; i < data.length; i++) {
                    if (usecdn && data[i].media) {
                        data[i].media = data[i].media.replace(cli._c.server.url, cli._c.content.cdn.domain);
                    }

                    data[i].title = data[i].title && (data[i].title[0] + (data[i].title.length > 1 ? (" ("+data[i].title.length+" pages)") : ""));
                    data[i].subtitle = data[i].subtitle && data[i].subtitle[0];
                }

                db.count(cli._c, 'content', {$and : match}, (err, total)  => {
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

            db.findToArray(cli._c, 'content', {status : "published"}, (err, arr)  => {
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
            }], (res)  => {
                callback(res);

            });
        } else {
            if (!cli.hasRight("list-articles")) {
                return callback({size:0,data:[],code:403});
            }

            // First, check for saved content
            db.aggregate(cli._c, 'content', [
                { $match : {_id: db.mongoID(levels[0])} },
                { $lookup : {
                    localField : "topic",
                    from : "topics",
                    foreignField : "_id",
                    as : "fulltopic"
                } },
                { $lookup : {
                    localField : "media",
                    from : "uploads",
                    foreignField : "_id",
                    as : "fullmedia"
                } }
            ], (arr)  => {
                // Not found, lets check autosaves
                if (arr && arr.length == 0) {
                    db.findToArray(cli._c, 'autosave', {
                        _id: db.mongoID(levels[0])
                    }, (err, arr)  => {
                        // Check if there is a newer version than this autosave
                        if (arr && arr.length > 0) {
                            db.findToArray(cli._c, 'content', {
                                _id: db.mongoID(arr[0].contentid),
                                date: {
                                    "$gte": arr[0].date
                                }
                            }, (err, content)  => {
                                if (content && content.length > 0) {
                                    arr[0].recentversion = content[0]._id;
                                }

                                db.findToArray(conf.default(), 'entities', {_id : arr[0].author}, (err, autarr)  => {
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
                        }, (err, autosave)  => {
                            if (autosave && autosave.length > 0) {
                                arr[0].recentversion = autosave[0]._id;
                            }
                            db.findToArray(conf.default(), 'entities', {_id : arr[0].author}, (err, autarr)  => {
                                arr[0].authorname = autarr[0] ? autarr[0].displayname : "[No Author]";
                                arr[0].author = autarr || {};

                                arr[0].fullmedia = arr[0].fullmedia.pop();
                                arr[0].fulltopic = arr[0].fulltopic.pop();

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

    form() {
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
            .trigger('fields')
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
                    'displayname': 'Save changes',
                    'type' : 'button',
                    'classes': ['btn-save']
                }, {
                    'name' : 'publish', 
                    'displayname': 'Package and finalize',
                    'type' : 'button',
                    'classes': ['btn-publish']
                }, {
                    'name' : 'rebuild', 
                    'displayname': 'Update and refresh',
                    'type' : 'button',
                    'classes': ['btn-rebuild']
                }, {
                    'name' : 'refuse',
                    'displayname' : 'Refuse review',
                    'type' : 'button',
                    'classes': ["btn-refuse-review", "role-production"]
                }
            ]}
        );
    }

    handleNext(cli) {
        var articleName = cli.routeinfo.path[1];
        this.deepFetch(cli._c, articleName, (deepArticle)  => {
             if (!deepArticle) {
                db.findToArray(cli._c, 'content', {aliases : articleName}, (err, arr)  => {
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

    articleIsPaginated(article) {
        return article && article.content && article.content.length > 1;
    };

    generateArticle(_c, aid, cb, alreadyFetched, pageIndex) {
        var workArticle = (deepArticle)  => {
            var gen = ()  => {
                var extra = {};
                extra.ctx = "article";
                extra.article = deepArticle;
                extra.topic = deepArticle.topic;

                if (deepArticle.topic && deepArticle.topic.override && deepArticle.topic.override.language) {
                    extra.language = deepArticle.topic.override.language;
                }

                hooks.fire('article_will_render', {
                    _c : _c,
                    article: deepArticle
                });

                var ctx = deepArticle.templatename || deepArticle.topic.articletemplate || "article";
                var filename = deepArticle.topicslug.substring(1) + deepArticle.name;

                if (deepArticle.content.length > 1) {
                    var pages = deepArticle.content;
                    var titles = deepArticle.title;
                    var subtitles = deepArticle.subtitle;

                    if (pageIndex === "all") {
                        log('Article', "Generated paginated article from admin panel : " + deepArticle.title[0]);
                        let cIndex = pages.length;

                        var nextPage = (resp)  => {
                            if (cIndex == 0) {
                                require('./fileserver.js').deleteFile(_c.server.html + "/" + deepArticle.topic.completeSlug + "/" + deepArticle.name + ".html", ()  => {
                                    log('Article', "Cleared non-paginated version of article from file system");
                                });

                                cb({
                                    success : true, 
                                    deepArticle : deepArticle,
                                    pages : pages.length
                                });
                            } else {
                                that.generateArticle(_c, deepArticle._id, (resp)  => {
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
                    deepArticle.title = titles[pageIndex - 1];
                    deepArticle.subtitle = subtitles[pageIndex - 1];
                    deepArticle.isPaginated = true;
                    deepArticle.totalPages = pages.length;
                    deepArticle.pageIndex = pageIndex;

                    deepArticle.url += "/" + pageIndex;

                    if (pageIndex != 1) {
                        deepArticle.featuredimage = [];
                        deepArticle.featuredimageartist = undefined;
                    }

                    log('Article', "Generated page " + pageIndex + " of paginated article " + deepArticle.title[0]);
                } else {
                    deepArticle.pageIndex = 1;
                    deepArticle.content = deepArticle.content[0];
                }

                var asyncHooks = hooks.getHooksFor('article_async_render_' + _c.uid);
                var aKeys = Object.keys(asyncHooks);
    
                var hookIndex = -1;
                var nextHook = ()  => {
                    if (++hookIndex != aKeys.length) {
                        var hk = asyncHooks[aKeys[hookIndex]];
                        hk.cb({
                            _c : _c,
                            done : nextHook,
                            article : deepArticle,
                            extra : extra
                        }, 'article_async_render_' + _c.uid)
                    } else {
                        // Generate LML page
                        filelogic.renderThemeLML(_c, ctx, filename + '.html', extra , (name)  => {
                            cb && cb({
                                success: true,
                                deepArticle : deepArticle
                            });
                        });
                    }
                };

                nextHook();
            };

            gen();
        };

        if (alreadyFetched && typeof aid == "object") {
            workArticle(aid);
        } else {
            that.deepFetch(_c, db.mongoID(aid), workArticle);
        }
    };

    generateFromName(cli, articleName, cb, onlyPublished, pageIndex) {
        this.deepFetch(cli._c, articleName, (deepArticle)  => {
            if (!deepArticle) {
                db.findToArray(cli._c, 'content', {aliases : articleName}, (err, arr)  => {
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
                    that.generateArticle(cli._c, deepArticle, (resp)  => {
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

    table() {
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

const that = new Article();
module.exports = that;
