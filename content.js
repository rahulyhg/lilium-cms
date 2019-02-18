const db = require('./includes/db');
const config = require('./config');
const filelogic = require('./filelogic');

const CDN = require('./lib/cdn');
const hooks = require('./hooks');
const notifications = require('./notifications');
const DeepDiff = require('deep-diff');
const mkdirp = require('mkdirp');
const fs = require('fs');
const diff = DeepDiff.diff;
const { JSDOM } = require('jsdom');

const CONTENT_COLLECTION = 'content';
const ENTITY_COLLECTION = 'entities';

const LOOKUPS = {
    media : { from : "uploads", as : "deepmedia", localField : "media", foreignField : "_id" },
    editions : { from : "editions", as : "alleditions", localField : "editions", foreignField : "_id" }
};

const PUBLICATION_REPORT_TODAY_PROJECTION = {
    headline : { $arrayElemAt : ["$title", 0] }, subline : { $arrayElemAt : ["$subtitle", 0] }, 
    date : 1, name : 1, facebookmedia : 1, author : 1
};

const PAST_PUBLISHED_PROJECTION = {
    headline : { $arrayElemAt : ["$title", 0] }, 
    "fulltopic.displayname" : 1, "fulltopic._id" : 1, "fulltopic.completeSlug" : 1,
    author : 1, date : 1
};

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

class ContentLib {
    create(_c, title, author, done) {
        db.findUnique(config.default(), 'entities', { _id : author }, (err, authorentity) => {
            log('Content', 'Entity ' + authorentity.displayname + ' is creating an article with original title : ' + title, 'info');

            const art = {
                title : [title],
                subtitle : [""],
                content : ["<p><br></p>"],
                author : author, 
                createdBy : author, 
                previewkey : Math.random().toString(32).substring(2),
                subscribers : [author],
                type : "post",
                status : "draft",
                shares : 0,
                hidden : false,
                updated : new Date(),
                aliases : [],
                language : 'en',
                createdOn : new Date()
            };

            authorentity.reportsto && authorentity.reportsto.length > 0 && art.subscribers.push(...authorentity.reportsto)

            db.insert(_c, CONTENT_COLLECTION, art, (err, result) => {
                hooks.fireSite(_c, 'contentCreated', {title, article : art})
                done && done(err, art);
            });
        }, {reportsto : 1, displayname : 1});
    }

    toPresentables(_c, articles) {
        return articles.map(x => this.toPresentable(_c, x, true));
    }

    toPresentable(_c, article, stripContent) {
        let featuredimages = {};
        if (article.featuredimage && article.featuredimage[0]) {
            for (let size in article.featuredimage[0].sizes) {
                featuredimages[size] = CDN.parseOne(_c, article.featuredimage[0].sizes[size].url);
            }

            article.featuredimageartist = article.featuredimage[0].artistname;
            article.featuredimagelink = article.featuredimage[0].artisturl;
        }

        let topic;
        if (article.topic) {
            topic = {
                id : article.topic._id,
                displayname : article.topic.displayname,
                slug : article.topic.slug,
                completeSlug : article.topic.completeSlug
            }
        }

        let author;
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

    generateJSON(_c, deepArticle, done) {
        log('Content', 'Creating JSON version of article ' + deepArticle._id, 'detail');
        const filedir = _c.server.html + "/content/"; 
        const fullpath = filedir + deepArticle._id + ".json";
        mkdirp(filedir, () => {
            fs.writeFile(fullpath, JSON.stringify(this.toPresentable(_c, deepArticle)), { encoding : "utf8" }, () => {
                log('Content', 'Created JSON version of article ' + deepArticle._id, 'success');
                done()
            });
        });
    }

    generateOrFallback({_c}, slug, sendback) {
        db.findUnique(_c, 'content', { $or : [{name:slug}, {aliases:slug}] }, (err, post) => {
            if (!post) {
                sendback(false);
            } else {
                if (slug == post.name) {
                    this.getFull(_c, post._id, deepArticle => {
                        this.generate(_c, deepArticle, () => {
                            sendback(true);
                        });
                    });
                } else {
                    sendback(true, { url : post.url });
                }
            }
        }, { _id : 1, name : 1 });
    }

    generate(_c, deepArticle, cb, pageIndex) {
        let extra = {};
        extra.ctx = "article";
        extra.article = deepArticle;
        extra.editions = deepArticle.editions;

        if (!extra.editions || extra.editions.length == 0) {
            log('Content', 'Cannot generate article without an edition, ID : ' + (deepArticle && deepArticle._id), 'warn');
            return cb && cb(new Error("Cannot generate article without an edition"));
        }

        if (deepArticle.deepmedia) {
            deepArticle.featuredimage = [ deepArticle.deepmedia ];
            deepArticle.imagecreditname = deepArticle.deepmedia.artistname;
            deepArticle.imagecrediturl = deepArticle.deepmedia.artisturl;
        }
        if (deepArticle.fullauthor) {
            deepArticle.authors = [deepArticle.fullauthor];
        }

        deepArticle.content = deepArticle.content.map(x => x.replace(/lml-fb-video/g, 'fb-video').replace(/lml-fb-post/g, 'fb-post'));

        hooks.fireSite(_c, 'article_will_render', {
            _c : _c,
            article: deepArticle
        });

        let ctx = deepArticle.templatename || "article";
        let filename = deepArticle.name;

        deepArticle.headline = deepArticle.title[0];
        deepArticle.headsub = deepArticle.subtitle[0]

        if (deepArticle.content.length > 1) {
            let pages = deepArticle.content;
            let titles = deepArticle.title;
            let subtitles = deepArticle.subtitle;

            if (pageIndex === "all") {
                log('Article', "Generated paginated article from admin panel : " + deepArticle.title[0]);
                let cIndex = pages.length;

                const nextPage = (resp)  => {
                    if (cIndex == 0) {
                        cb && cb({
                            success : true, 
                            deepArticle : deepArticle,
                            pages : pages.length
                        });
                    } else {
                        this.generateArticle(_c, deepArticle, (resp)  => {
                            cIndex--;
                            nextPage(resp);
                        }, cIndex);
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
            deepArticle.numberOfPages = pages.length;
            deepArticle.title = titles[pageIndex - 1];
            deepArticle.subtitle = subtitles[pageIndex - 1];
            deepArticle.isPaginated = true;
            deepArticle.totalPages = pages.length;
            deepArticle.pageIndex = pageIndex;

            if (deepArticle.title.indexOf(deepArticle.headline) != -1) {
                deepArticle.similartitle = true;
            }

            hooks.fireSite(_c, 'paginated_article_generated', { article : deepArticle, page : pageIndex });

            deepArticle.url += "/" + pageIndex;

            if (pageIndex != 1) {
                deepArticle.featuredimage = [];
                deepArticle.featuredimageartist = undefined;
                deepArticle.imagecreditname = undefined;
            }

            log('Article', "Generated page " + pageIndex + " of paginated article " + deepArticle.title[0]);
        } else {
            deepArticle.pageIndex = 1;
            deepArticle.content = deepArticle.content[0];
            deepArticle.title = deepArticle.title[0];
            deepArticle.subtitle = deepArticle.subtitle[0];
            deepArticle.numberOfPages = 1;
        }
 
        const asyncHooks = hooks.getSiteHooksFor(_c, 'article_async_render') || [];
        const dom = new JSDOM(deepArticle.content);
    
        let hookIndex = -1;
        const nextHook = () => {
            if (++hookIndex != asyncHooks.length) {
                let hk = asyncHooks[hookIndex];
                hk({
                    done : nextHook,
                    article : deepArticle,

                    _c, dom, extra
                }, 'article_async_render')
            } else {
                // Generate LML page
                filelogic.renderThemeLML3(_c, ctx, deepArticle.alleditions.map(x => x.lang[deepArticle.language||"en"].slug).join('/') + "/" + filename + '.html', extra , (name)  => {
                    cb && cb({
                        success: true,
                        deepArticle : deepArticle
                    });
                });
            }
        };

        this.generateJSON(_c, deepArticle, () => {
            nextHook();
        });
    }

    updateActionStats(_c, deepArticle, callback, reduce) {
        var stats = {
            $inc : {
                p   : countOcc(deepArticle, '</p>') * (reduce ? -1 : 1),
                img : countOcc(deepArticle, '<img') * (reduce ? -1 : 1),
                ad  : countOcc(deepArticle, 'lml-adplaceholder') * (reduce ? -1 : 1)
            }
        };
        var entity = db.mongoID(deepArticle.author);

        db.update(require('./config').default(), 'actionstats', {entity, type : "article_content"}, stats, (err, r)  => {
            err && log('Article', 'Error during action stats : ' + err, 'err');
            callback && callback(err ? err : r && r.value);
        }, true, true, true, true);
    };

    generatePublicationReport(_c, _id, sendback) {
        this.getFull(_c, _id, article => {
            const doc = new (require('jsdom')).JSDOM(article.content.join(' ')).window.document;
            
            const start = new Date();
            start.setHours(0,0,0,0);

            const end = new Date();
            end.setHours(23,59,59,999);

            const date = {$gte: start, $lt: end};

            db.count(_c, 'content', { author : article.author }, (err, authortotal) => {
                db.count(_c, 'content', { author : article.author, date }, (err, authortotaltoday) => {
                    db.count(_c, 'content', { status : "published" }, (err, websitetotal) => {
                        db.count(require('./config').default(), 'decorations', { entity : article.author }, (err, decorations) => {
                            db.join(_c, 'content', [
                                { $match : { date : {$lt : article.date }, status : "published" } },
                                { $sort : { date : -1 } },
                                { $limit : 20 },
                                { $sort : { date : 1 } },
                                { $project : PUBLICATION_REPORT_TODAY_PROJECTION },
                            ], lastpublished => {
                                lastpublished.push({
                                    headline : article.title[0], subline : article.subtitle[0], 
                                    date : article.date, name : article.name, facebookmedia : article.facebookmedia, 
                                    author : article.author._id || article.author, editions : article.editions
                                });

                                db.join(_c, 'hits', [
                                    { $match : { path : "/lilium/publishing/write/" + _id.toString() }},
                                    { $group : { _id : "$userid", timespent : { $sum : "$timespent" } } },
                                    { $project : { timespent : 1, userid : "$_id" } }
                                ], hits => {
                                    sendback({
                                        authortotal, authortotaltoday, decorations, websitetotal, lastpublished, 
                                        totaltime : hits,
                                        url : article.url,
                                        headline : article.headline,
                                        subline : article.subtitle[0],
                                        fullauthor : article.fullauthor,
                                        timespent : article.date - article.createdOn,
                                        media : article.deepmedia.sizes.facebook.url,
                                        nsfw : article.nsfw,
                                        isSponsored : article.isSponsored,
                                        ads : doc.querySelectorAll('.lml-adplaceholder').length,
                                        p : doc.querySelectorAll('p').length,
                                        img : doc.querySelectorAll('img').length,
                                        paginated : article.content.length < 1
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    bunch(_c, filters = {}, sort, max = 50, skip = 0, sendback) {
        const $match = { status : { $ne : "destroyed" } };
        const $sort = { [sort || "_id"] : -1 };
        const $limit = max;
        const $skip = skip;
        const $project = {
            headline : { $arrayElemAt : ["$title", 0] },
            subtitle : { $arrayElemAt : ["$subtitle", 0] },
            thumbnail : "$deepmedia.sizes.square.url",
            topic : "$fulltopic.displayname",
            status : 1, date : 1, author : 1, shares : 1, previewkey : 1, name : 1
        };

        if (filters.status) { $match.status = filters.status };
        if (filters.author) { $match.author = db.mongoID(filters.author) };
        if (filters.isSponsored) { $match.isSponsored = filters.isSponsored.toString() == "true" ? true : { $ne : true } };
        if (filters.search && filters.search.trim()) { 
            $match.$text = { $search : filters.search.trim().split(' ').map(x => "\"" + x + "\"").join(' ') };
        }
        if (sort == "updated") {
            $match.updated = { $exists : 1 };
        }

        const pipeline = [
            { $match }, 
            { $sort },
            { $skip },
            { $limit },
            { $lookup : LOOKUPS.media },
            { $lookup : LOOKUPS.editions },
            { $unwind : { path : "$deepmedia", preserveNullAndEmptyArrays : true } },
            { $project }
        ];

        db.join(_c, CONTENT_COLLECTION, pipeline, arr => sendback({ items : arr }));
    }

    fetchSponsoredInformation(_c, post, done) {
        if (post.isSponsored && post.useSponsoredBox && post.sponsoredBoxLogo) {
            db.findUnique(_c, 'uploads', { _id : db.mongoID(post.sponsoredBoxLogo) }, (err, image) => {
                if (image) {
                    post.sponsoredBoxLogoURL = image.sizes.square.url;
                    post.sponsoredBoxLogoImage = image;
                }
                
                done();
            });
        } else {
            done();
        }
    }

    batchFetch(_c, matches, callback, fieldToMatch = "_id") {
        let index = -1;
        const posts = [];
        const next = () => {
            if (++index == matched.length) {
                callback(posts);
            } else {
                this.getFull(_c, undefined, deeparticle => {
                    posts.push(deeparticle);
                }, { [fieldToMatch] : matches[index] });
            }
        };

        next();
    }

    getFull(_c, _id, sendback, match = {}, collection = CONTENT_COLLECTION) {
        const $match = match;
        if (_id) {
            $match._id = db.mongoID(_id);
        }

        db.join(_c, collection, [
            { $match },
            { $limit : 1 },
            { $lookup : LOOKUPS.media },
            { $lookup : LOOKUPS.editions },
            { $unwind : { path : "$deepmedia", preserveNullAndEmptyArrays : true } },
        ], arr => {
            const post = arr[0];
            if (!post) {
                return sendback();
            }

            if (post.alleditions) {
                post.overrides = post.alleditions.reduce((cur, acc) => Object.assign(
                    cur, acc.lang[post.language || "en"]
                ), {});
            }

            db.findUnique(config.default(), ENTITY_COLLECTION, { _id : post.author }, (err, author) => {
                post.fullauthor = author;
                post.headline = post.title[0];
                if (post.alleditions) {
                    post.alleditions.sort((a, b) => a.level - b.level);
                }

                // post.url = post.fulltopic && post.name && (_c.server.protocol + _c.server.url + "/" + post.fulltopic.completeSlug + "/" + post.name);

                hooks.fireSite(_c, 'contentGetFull', {article : post});
                this.fetchSponsoredInformation(_c, post, () => {
                    sendback(post);
                })
            }, { displayname : 1, username : 1, avatarURL : 1, avatarMini : 1, slug : 1, revoked : 1 });
        });
    }

    pushHistoryEntryFromDiff(_c, postid, actor, diffres, type, done, oldpost, newpost) {
        const diffs = diffres.filter(d => typeof d.rhs != "undefined" || d.kind == "A").map(d => {
            return {
                field : d.path[0],
                kind : d.kind
            }
        }).filter(
            (thing, index, self) => index === self.findIndex(t => (t.place === thing.place && t.field == thing.field))
        );

        if (diffs.length != 0) {
            const entry = {
                diffs, actor, type, postid,
                at : new Date(),
            }
    
            hooks.fireSite(_c, 'pushingContentDiff', {postid, actor, diffres, type});
            const hasContentDiff = !!diffs.find(x => x.field == "content");
            if (hasContentDiff) {
                entry.content = newpost.content[0];
                entry.hasdiff = true;
            }
            
            db.insert(_c, 'contenthistory', entry, (err, r) => done(entry));
        } else {
            done();
        }
    }

    getHistoryList(_c, postid, sendback) {
        db.find(_c, 'contenthistory', { postid : db.mongoID(postid) }, [], (err, cur) => {
            cur.sort({ _id : -1 }).project({ 
                actor : 1, at : 1, type : 1, diffs : 1, hasdiff : 1
            }).toArray((err, arr) => sendback(arr));
        });
    }

    getPatch(_c, patchid, sendback) {
        db.findUnique(_c, 'contenthistory', { _id : db.mongoID(patchid) }, (err, patch) => {
            sendback({ patch });
        });
    }

    parseSpecialValues(v) {
        v.date && (v.date = new Date(v.date));
        v.author && (v.author = db.mongoID(v.author));
        v.media && (v.media = db.mongoID(v.media));
        v.sponsoredBoxLogo && (v.sponsoredBoxLogo = db.mongoID(v.sponsoredBoxLogo));

        if (v.editions) {
            v.editions = v.editions.map(ed => db.mongoID(ed));
        }

        if (v.topic == null || typeof v.topic == "undefined") {
            delete v.topic;
        }

        return v;
    }

    editSlug(_c, postid, caller, name, callback) {
        log('Content', 'Updating article\' slug with id ' + postid, 'detail');
        db.exists(_c, 'content', { name }, existing => {
            if (!existing) {
                db.join(_c, 'content', [
                    { $match : { _id : postid } },
                    { $lookup : LOOKUPS.editions }, 
                    { $project : { fulltopic : 1, name : 1, title : 1, alleditions : 1 } }
                ], article => {
                    const url = "/" + article[0].alleditions.map(x => x.slug).join('/') + "/" + article[0].name
                    db.update(_c, 'content', { _id : postid }, { 
                        $set : { name, url },
                        $addToSet : { aliases : article[0].name }
                    }, () => {
                        this.pushHistoryEntryFromDiff(_c, postid, caller, diff(
                            { name : article[0].name }, { name }
                        ), 'slug', entry => {
                            hooks.fireSite(_c, 'slug_edited', {
                                _c : _c,
                                oldslug : article[0].name,
                                newslug : name,
                                oldurl : "/" + article[0].url, 
                                paginated : article[0].title.length > 1
                            });

                            hooks.fireSite(_c, 'article_updated', { article : article[0], _c });

                            if (url) {
                                callback(
                                    undefined, 
                                    _c.server.protocol + _c.server.url + url
                                );
                            } else {
                                callback(undefined, name);
                            }
                        });
                    }, false, true, true);
                });
            } else {
                callback({message : "Slug already used by another article", type : "exists"});
            }
        });
    }

    getPastPublished(_c, params, done) {
        const $gt = new Date(params.from || (Date.now() - (1000 * 60 * 60 * 24)));
        const $lt = new Date(params.until || Date.now());

        const pipeline = [
            { $match : { status : "published", $and : [{ date : {$gt} }, { date : {$lt} }] } },
            { $lookup : LOOKUPS.editions }, 
            { $project : PAST_PUBLISHED_PROJECTION },
            { $group : { _id : { day: {$dayOfYear : "$date"}, year : { $year : "$date" } }, articles : { $push : "$$ROOT" } } },
            { $sort : { _id : 1 } },
            { $project : { date : "$_id", _id : 0, articles : 1 } }
        ]

        db.join(_c, 'content', pipeline, posts => {
            done(posts);
        });
    }

    fetchDeepFieldsFromDiff(_c, post, deepdiff, done) {        
        const fields = deepdiff.diffs.map( x => x.field );

        if (fields.includes('media') && post.media) {
            db.findUnique(_c, 'uploads', { _id : post.media }, (err, media) => {
                if (media) {
                    post.facebookmedia = _c.server.protocol + media.sizes.facebook.url;
                } 

                done();
            });
        } else {
            done();
        }
    }

    update(_c, postid, caller, values, callback) {
        this.parseSpecialValues(values);

        log('Content', 'Updating article with id ' + postid, 'detail');
        db.rawCollection(_c, 'content', {}, (err, col) => {
            col.findOne({ _id : postid }, {}, (err, oldpost) => {
                const newpost = {};
                Object.assign(newpost, oldpost, values);

                const deepdiff = diff(oldpost, newpost);
                if (!deepdiff) {
                    log('Content', 'Did not update article (no diff) with headline ' + newpost.title[0] + " (" + newpost._id + ")", 'info');
                    callback();
                } else {

                    this.pushHistoryEntryFromDiff(_c, postid, caller, deepdiff, 'update', entry => {
                        if (entry) {
                            this.fetchDeepFieldsFromDiff(_c, newpost, entry, () => {
                                newpost.updated = new Date();
                                col.updateOne({_id : postid}, { $set : newpost }, {}, (err, r) => {
                                    log('Content', 'Updated article with headline ' + newpost.title[0], 'success');

                                    hooks.fireSite(_c, 'article_updated', { article : newpost, _c, full : false });
                                    notifications.emitToWebsite(_c.id, {
                                        articleid : postid,
                                        at : Date.now(),
                                        by : caller,
                                        historyentry : entry
                                    }, "articleUpdate");

                                    callback(undefined, entry);
                                });
                            });
                        } else {
                            log('Content', 'Did not update article (no diff) with headline ' + newpost.title[0], 'info');
                            callback();
                        }
                    }, oldpost, newpost);
                }
            });
        });
    }

    shallowCompare(a, b) {
        return !(
            a.title.map((x, i) => x == b.title[i]).includes(false) ||
            a.subtitle.map((x, i) => x == b.subtitle[i]).includes(false) ||
            a.content.map((x, i) => x == b.content[i]).includes(false)
        );
    }

    autosave(_c, contentid, data, done) {
        data = this.parseSpecialValues(data);
        this.getLatestAutosave(_c, contentid, last => {
            if (!last || !this.shallowCompare(last.data, data)) {
                db.insert(_c, 'autosave', {
                    data, contentid,
                    at : new Date()
                }, () => {
                    done && done({ok : 1, inserted : true });
                });
            } else {
                done && done({ ok : 1, inserted : false, reason : "nodiff" });
            }
        });
    };

    getLatestAutosave(_c, contentid, send) {
        db.find(_c, 'autosave', { contentid }, [], (err, cur) => {
            cur.sort({_id : -1}).limit(1).next((err, entry) => {
                send(entry);
            });
        });
    };

    validate(_c, _id, caller, sendback) {
        this.getFull(_c, _id, post => { 
            if (!post) {
                return sendback({ error : "Post not found", code : 404 });
            }

            db.findUnique(config.default(), 'entities', { _id : caller }, (err, fullrequester) => {
                try {
                    if (fullrequester.roles.includes('editor') || !post.author || caller.toString() == post.author.toString()) {
                        if (!post.date) {
                            post.date = new Date();
                            post.date = post.date;
                        }

                        post.seotitle = post.seotitle || post.title[0]
                        post.seosubtitle = post.seosubtitle || post.subtitle[0]

                        if (!post.name) {
                            post.name = require('slug')(post.seotitle).toLowerCase();
                            post.name = post.name;
                        }

                        if (
                            !post.editions || post.editions.length == 0 || !post.author || !post.media || 
                            !post.title[0] || !post.subtitle[0] || !post.content[0]
                        ) {
                            return sendback({ error : "Missing fields", code : 401 });
                        }

                        sendback(undefined, post);
                    } else {
                        return sendback({ error : "Missing rights", code : 403 });
                    }
                } catch (err) {
                    log('Publishing', 'Error validating post', 'err');
                    console.log(err);
                    sendback({ error : err.toString(), code : 500, stack : err });
                }
            });
        });
    }

    publish(_c, _id, caller, sendback) {
        this.validate(_c, _id, caller, (err, post) => {
            if (err) {
                return sendback(err);
            } 

            try {
                const updated = {
                    status : "published",
                    publishedOn : new Date(),
                    publishedAt : Date.now(),
                    date : new Date(),
                    name : post.name,
                    url : "/" + post.alleditions.map(x => x.lang[post.language || "en"].slug).join('/') + "/" + post.name
                };

                db.update(_c, 'content', { _id : post._id }, updated, () => {
                    db.remove(_c, 'autosave', { contentid : post._id }, () => {
                        this.pushHistoryEntryFromDiff(_c, post._id, caller, diff({}, { status : "published" }), 'published', historyentry => {
                            this.updateActionStats(_c, post, score => {
                                hooks.fireSite(_c, 'article_published_from_draft', { article : post, score, _c });
                                hooks.fireSite(_c, 'article_updated', { article : post, _c });
                                hooks.fire('article_published', {
                                    article: post, _c
                                });

                                this.generate(_c, post, () => {
                                    sendback({ historyentry, newstate : post });

                                    notifications.emitToWebsite(_c.id, {
                                        articleid : post._id,
                                        at : Date.now(),
                                        by : caller
                                    }, "articlePublished");

                                    if (caller.toString() != (post.author && post.author.toString())) {
                                        notifications.notifyUser(post.author, _c.id, {
                                            title: "Article published",
                                            msg: post.title + ' was published on the website.',
                                            type: 'success'
                                        });
                                    }
                                }, 'all');
                            });
                        });
                    });
                });
            } catch (err) {
                log('Publishing', 'Error validating post', 'err');
                console.log(err);
                sendback({ error : err.toString(), code : 500, stack : err });
            }
        });
    }

    refreshURL(_c, fullpost, caller, done) {
        const url = "/" + fullpost.alleditions.map(x => x.lang[fullpost.language || "en"].slug).join('/') + "/" + fullpost.name;
        if (fullpost.url != url) {
            log('Content', 'Updating URL from ' + fullpost.url + ' to ' + url, 'info');
            fullpost.aliases = [...(fullpost.aliases || []), fullpost.url];
            fullpost.url = url;

            db.update(_c, 'content', { _id : fullpost._id }, {
                url : fullpost.url,
                aliases : fullpost.aliases
            }, () => {
                this.pushHistoryEntryFromDiff(_c, fullpost._id, caller, diff({}, { url, aliases : fullpost.aliases }), 'update', historyentry => {
                    done(historyentry, { url, aliases : fullpost.aliases });
                });
            });
        } else {
            done();
        }
    }

    regenerateFromSlug(_c, slug, done) {
        db.findUnique(_c, 'content', { name : slug, status : "published" }, (err, article) => {
            article ? this.regenerate(_c, article._id, done) : done(false);
        }, {_id : 1});
    }

    regenerate(_c, _id, done) {
        this.getFull(_c, _id, fullpost => {
            fullpost ? this.generate(_c, fullpost, () => {
                done(fullpost);
            }) : done(false);
        });
    }

    sendForReview(_c, postid, author, callback) {
        db.update(_c, 'content', { _id : postid }, {status : "reviewing"}, ()  => {
            this.pushHistoryEntryFromDiff(_c, postid, author, diff({}, { status : "published" }), 'submitted', historyentry => {
                callback && callback({ historyentry });
            });

            const defaultConfig = require('./config.js').default();
            db.findUnique(defaultConfig, 'entities', { _id : author }, (err, contractor) => {
                db.findUnique(defaultConfig, 'entities', {_id : contractor.reportsto}, (err, reportee) => {
                    db.findUnique(_c, 'content', { _id : postid }, (err, article) => {
                        if (reportee) {
                            require('./mail.js').triggerHook(_c, 'article_sent_for_review', reportee.email, {
                                to : reportee, 
                                article, contractor
                            });
    
                            notifications.notifyUser(reportee, _c.id, {
                                title: "Article sent for review",
                                url : "/lilium/publishing/write/" + postid,
                                msg: 'An article has been sent for review by ' + contractor.displayname,
                                type: 'info'
                            });
                        }

                        hooks.fireSite(_c, 'article_sentForReview', { article, contractor });
                    });
                });
            });
        });
    }

    refuseSubmission(_c, postid, caller, callback) {
        db.update(_c, 'content', { _id : postid }, { status : "draft" }, () => {
            this.pushHistoryEntryFromDiff(_c, postid, caller, diff({}, { status : "draft" }), 'refused', historyentry => {
                this.getFull(_c, postid, newstate => {
                    hooks.fireSite(_c, 'article_refusedSubmission', { article : newstate, by : caller });

                    notifications.notifyUser(newstate.author, _c.id, {
                        title: "Your article has been reviewed",
                        msg: newstate.title[0] + ' was not accepted. Some modifications are needed before it can go live.',
                        type: 'info'
                    });

                    callback && callback({ historyentry, newstate });
                });
            });
        });
    }

    unpublish(_c, postid, caller, callback) {
        db.update(_c, 'content', { _id : postid }, { status : "deleted" }, () => {
            this.getFull(_c, postid, fullpost => {
                this.updateActionStats(_c, fullpost, () => {
                    this.pushHistoryEntryFromDiff(_c, postid, caller, diff({}, { status : "deleted" }), 'unpublished', historyentry => {
                        callback({ historyentry, newstate : fullpost });
                    });

                    hooks.fireSite(_c, 'article_unpublished', { article : fullpost, _c });
                    hooks.fireSite(_c, 'article_updated', { article : fullpost, _c });
    
                    if (fullpost.fulltopic && fullpost.title && fullpost.title.length > 1) {
                        fullpost.title.forEach((x, i) => {
                            fileserver.deleteFile(_c.server.html + "/" + fullpost.fulltopic.completeSlug + "/" + fullpost.name + "/" + (i+1) + ".html", () => {});
                        })
                    } else if (fullpost.fulltopic) {
                        fileserver.deleteFile(_c.server.html + "/" + fullpost.fulltopic.completeSlug + "/" + fullpost.name + ".html", () => {});
                    }

                    fileserver.deleteFile(_c.server.html + "/amp/" + fullpost.name + ".html", () => {});
                }, true);
            });
        });
    }

    // /publishing/bulkstats/$type
    generateBulkStats(_c, type, params, sendback) {
        const $gt = new Date(params.from || (Date.now() - (1000 * 60 * 60 * 24)));
        const $lt = new Date(params.until || Date.now());

        if (type == "populartopics") {
            const pipeline = [
                { $match : { status : "published", $and : [{ date : {$gt} }, { date : {$lt} }] } },
                { $group : { _id : "$editions", published : { $sum : 1 } } },
                { $lookup : { from : "editions", as : "alleditions", localField : '_id', foreignField : '_id' } },
                { $sort : { published : -1 } },
                { $project : { 
                    _id : 0, published : 1,
                    "alleditions.displayname" : 1,
                    "alleditions.slug" : 1
                } },
                { $limit : 10 }
            ];

            db.join(_c, 'content', pipeline, arr => sendback(arr));
        } else {
            sendback(["Unknown type " + type]);
        }
    }

    destroy(_c, postid, caller, callback) {
        db.update(_c, 'content', { _id : postid }, { status : "destroyed" }, () => {
            this.getFull(_c, postid, fullpost => {
                this.pushHistoryEntryFromDiff(_c, postid, caller, diff({}, { status : "destroyed" }), 'destroyed', historyentry => {
                    callback({ historyentry, newstate : fullpost });
                });

                hooks.fireSite(_c, 'article_updated', { article : fullpost, _c });

                if (fullpost.fulltopic && fullpost.title && fullpost.title.length > 1) {
                    fullpost.title.forEach((x, i) => {
                        fileserver.deleteFile(_c.server.html + "/" + fullpost.fulltopic.completeSlug + "/" + fullpost.name + "/" + (i+1) + ".html", () => {});
                    })
                } else if (fullpost.fulltopic) {
                    fileserver.deleteFile(_c.server.html + "/" + fullpost.fulltopic.completeSlug + "/" + fullpost.name + ".html", () => {});
                }
            });
        });
    }

    facebookDebug(_c, userid, postid, done) {
        db.findUnique(_c, 'content', {_id : postid}, (err, article) => {
            if (_c.social.facebook.appid && _c.social.facebook.token) {
                log('Facebook', 'Sending request to debug link');
                require('request')({
                    url : 'https://graph.facebook.com/v' + _c.social.facebook.apiversion || "2.8",
                    body : {
                        scrape : true,
                        access_token : _c.social.facebook.token,
                        id : _c.server.protocol + _c.server.url + "/" + article.name
                    },
                    json : true,
                    method : "POST"
                }, (a, b, c)  => {
                    if (c && c.title) {
                        log('Facebook', 'Debugger responded with title', "success");
                        notifications.notifyUser(userid, _c.id, {
                            title: "Facebook Graph",
                            msg: article.title[0]+ " has been debugged on Facebook Graph.",
                            type: 'log'
                        });

                        hooks.fireSite(_c, 'contentFacebookDebug', {article});
                    } else {
                        log('Facebook', 'Debugger responded with error', "warn");
                        notifications.notifyUser(userid, _c.id, {
                            title: "Facebook Graph",
                            url : "https://developers.facebook.com/tools/debug/og/object/",
                            msg: article.title[0] + ' was not debugged on Facebook Graph.',
                            type: 'warning'
                        });
                    }
                });
            }
        });

        done && done();
    }

    getPreview(_c, postid, previewkey, sendback) {
        // this.parseSpecialValues(payload);

        db.findUnique(_c, 'content', { _id : postid, previewkey }, (err, previewpost) => {
            if (!previewpost) {
                return sendback(404);
            }

            db.findUnique(_c, 'topics', { _id : previewpost.topic }, (err, fulltopic) => {
                db.findUnique(_c, 'uploads', { _id : previewpost.media }, (err, deepmedia) => {
                    db.findUnique(config.default(), 'entities', { _id : previewpost.author }, (err, fullauthor) => {
                        previewpost.fulltopic = fulltopic;
                        previewpost.deepmedia = deepmedia;
                        previewpost.fullauthor = fullauthor;

                        previewpost.content = [previewpost.content.join('<hr >')];
                        previewpost.title = [previewpost.title[0]];
                        previewpost.subtitle = [previewpost.subtitle[0]];

                        if (deepmedia) {
                            previewpost.featuredimage = [deepmedia];
                            previewpost.imagecreditname = previewpost.deepmedia.artistname;
                            previewpost.imagecrediturl  = previewpost.deepmedia.artisturl;
                        }

                        previewpost.authors = [fullauthor];

                        const ctx = previewpost.templatename || (previewpost.fulltopic && previewpost.fulltopic.articletemplate) || "article";

                        const extra = {
                            ctx : "article",
                            contextname : ctx,
                            preview : true, 
                            topic : fulltopic, 
                            article : previewpost
                        };

                        const abspath  = _c.server.html + "/static/tmp/preview" + Math.random().toString().slice(2) + Math.random().toString().slice(2) + ".tmp";

                        hooks.fireSite(_c, 'contentWillPreview', {article : previewpost, extra});
                        filelogic.renderThemeLML3(_c, ctx, abspath, extra, markup => sendback(undefined, markup));
                    });
                });
            });
        });
    }
}

module.exports = new ContentLib();
