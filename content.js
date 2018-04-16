const db = require('./includes/db');
const config = require('./config');
const filelogic = require('./filelogic');
const log = require('./log');
const hooks = require('./hooks');
const DeepDiff = require('deep-diff');
const mkdirp = require('mkdirp');
const fs = require('fs');
const diff = DeepDiff.diff;

const CONTENT_COLLECTION = 'content';
const ENTITY_COLLECTION = 'entities';

const LOOKUPS = {
    media : { from : "uploads", as : "deepmedia", localField : "media", foreignField : "_id" },
    topic : { from : "topics", as : "fulltopic", localField : "topic", foreignField : "_id" }
};

const PUBLICATION_REPORT_TODAY_PROJECTION = {
    headline : { $arrayElemAt : ["$title", 0] }, "date" : 1, "name" : 1 
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
                subscribers : [author],
                type : "post",
                status : "draft",
                shares : 0,
                updated : new Date(),
                createdOn : new Date()
            };

            authorentity.reportsto && authorentity.reportsto.length > 0 && art.subscribers.push(...authorentity.reportsto)

            db.insert(_c, CONTENT_COLLECTION, art, (err, result) => {
               done && done(err, art);
            });
        }, {reportsto : 1, displayname : 1});
    }

    generateJSON(_c, deepArticle, done) {
        log('Content', 'Creating JSON version of article ' + deepArticle._id, 'detail');
        const filedir = _c.server.html + "/content/"; 
        const fullpath = filedir + deepArticle._id + ".json";
        mkdirp(filedir, () => {
            fs.writeFile(fullpath, JSON.stringify(require('./article').toPresentable(_c, deepArticle)), { encoding : "utf8" }, () => {
                log('Content', 'Created JSON version of article ' + deepArticle._id, 'success');
                done()
            });
        });
    }

    generate(_c, deepArticle, cb, pageIndex) {
        const allDone = response => {
            this.generateJSON(_c, deepArticle, () => {
                cb && cb(response);
            });
        };

        let extra = {};
        extra.ctx = "article";
        extra.article = deepArticle;
        extra.topic = deepArticle.topic;

        if (!extra.topic) {
            log('Content', 'Cannot generate article without a topic, ID : ' + (deepArticle && deepArticle._id), 'warn');
            return cb && cb(new Error("Cannot generate article without a topic"));
        }

        // Legacy support
        if (deepArticle.fulltopic) {
            deepArticle.topic = deepArticle.fulltopic;
            deepArticle.topicslug = deepArticle.topic.completeSlug;
            extra.topic = deepArticle.fulltopic;
        }
        if (deepArticle.deepmedia) {
            deepArticle.featuredimage = [ deepArticle.deepmedia ];
            deepArticle.imagecreditname = deepArticle.deepmedia.artistname;
            deepArticle.imagecrediturl = deepArticle.deepmedia.artisturl;
        }
        if (deepArticle.fullauthor) {
            deepArticle.authors = [deepArticle.fullauthor];
        }

        if (deepArticle.topic && deepArticle.topic.override && deepArticle.topic.override.language) {
            extra.language = deepArticle.topic.override.language;
        }

        deepArticle.content = deepArticle.content.map(x => x.replace(/lml-fb-video/g, 'fb-video').replace(/lml-fb-post/g, 'fb-post'));

        hooks.fire('article_will_render', {
            _c : _c,
            article: deepArticle
        });

        let ctx = deepArticle.templatename || (deepArticle.topic && deepArticle.topic.articletemplate) || "article";
        let filename = deepArticle.topicslug.substring(1) + deepArticle.name;

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
                        require('./fileserver.js').deleteFile(_c.server.html + "/" + deepArticle.topic.completeSlug + "/" + deepArticle.name + ".html", ()  => {
                            log('Article', "Cleared non-paginated version of article from file system");
                        });

                        allDone({
                            success : true, 
                            deepArticle : deepArticle,
                            pages : pages.length
                        });
                    } else {
                        require('./article').generateArticle(_c, deepArticle._id, (resp)  => {
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
            deepArticle.numberOfPages = pages.length;
            deepArticle.title = titles[pageIndex - 1];
            deepArticle.subtitle = subtitles[pageIndex - 1];
            deepArticle.isPaginated = true;
            deepArticle.totalPages = pages.length;
            deepArticle.pageIndex = pageIndex;

            if (deepArticle.title.indexOf(deepArticle.headline) != -1) {
                deepArticle.similartitle = true;
            }

            hooks.fire('paginated_article_generated_' + _c.uid, { article : deepArticle, page : pageIndex });

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
 
        const asyncHooks = hooks.getHooksFor('article_async_render_' + _c.uid);
        const aKeys = Object.keys(asyncHooks);
    
        let hookIndex = -1;
        const nextHook = ()  => {
            if (++hookIndex != aKeys.length) {
                let hk = asyncHooks[aKeys[hookIndex]];
                hk.cb({
                    _c : _c,
                    done : nextHook,
                    article : deepArticle,
                    extra : extra
                }, 'article_async_render_' + _c.uid)
            } else {
                // Generate LML page
                filelogic.renderThemeLML(_c, ctx, filename + '.html', extra , (name)  => {
                    allDone({
                        success: true,
                        deepArticle : deepArticle
                    });
                });
            }
        };

        nextHook();
    }

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
                    db.count(require('./config').default(), 'decorations', { entity : article.author }, (err, decorations) => {
                        db.join(_c, 'content', [
                            { $match : { date } },
                            { $limit : 200 },
                            { $project : PUBLICATION_REPORT_TODAY_PROJECTION },
                            { $sort : { date : -1 } }
                        ], today => {
                            sendback({
                                authortotal, authortotaltoday, decorations, today,
                                url : article.url,
                                headline : article.headline,
                                subline : article.subtitle[0],
                                fullauthor : article.fullauthor,
                                fulltopic : article.fulltopic,
                                media : article.deepmedia.sizes.facebook.url,
                                nsfw : article.nsfw,
                                isSponsored : article.isSponsored,
                                ads : doc.querySelectorAll('ad').length,
                                p : doc.querySelectorAll('p').length,
                                img : doc.querySelectorAll('img').length,
                                paginated : article.content.length < 1
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
            status : 1, date : 1, author : 1, shares : 1
        };

        if (filters.status) { $match.status = filters.status };
        if (filters.author) { $match.author = db.mongoID(filters.author) };
        if (filters.isSponsored) { $match.isSponsored = filters.isSponsored.toString() == "true" ? true : { $ne : true } };

        const pipeline = [
            { $match }, 
            { $sort },
            { $skip },
            { $limit },
            { $lookup : LOOKUPS.media },
            { $lookup : LOOKUPS.topic },
            { $unwind : { path : "$deepmedia", preserveNullAndEmptyArrays : true } },
            { $unwind : { path : "$fulltopic", preserveNullAndEmptyArrays : true } },
            { $project }
        ];

        db.join(_c, CONTENT_COLLECTION, pipeline, arr => sendback({ items : arr }));
    }

    getFull(_c, _id, sendback, match = {}, collection = CONTENT_COLLECTION) {
        const $match = match;
        $match._id = db.mongoID(_id);

        db.join(_c, collection, [
            { $match },
            { $limit : 1 },
            { $lookup : LOOKUPS.media },
            { $lookup : LOOKUPS.topic },
            { $unwind : { path : "$deepmedia", preserveNullAndEmptyArrays : true } },
            { $unwind : { path : "$fulltopic", preserveNullAndEmptyArrays : true } },
        ], arr => {
            const post = arr[0];
            if (!post) {
                return sendback();
            }

            db.findUnique(config.default(), ENTITY_COLLECTION, { _id : post.author }, (err, author) => {
                post.fullauthor = author;
                post.headline = post.title[0];
                post.url = post.fulltopic && post.name && (_c.server.protocol + _c.server.url + "/" + post.fulltopic.completeSlug + "/" + post.name);

                sendback(post);
            }, { displayname : 1, username : 1, avatarURL : 1, avatarMini : 1, slug : 1, revoked : 1 });
        });
    }

    pushHistoryEntryFromDiff(_c, postid, actor, diffres, type, done) {
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
    
            db.insert(_c, 'contenthistory', entry, (err, r) => done(entry));
        } else {
            done();
        }
    }

    getHistoryList(_c, postid, sendback) {
        db.find(_c, 'contenthistory', { postid : db.mongoID(postid) }, [], (err, cur) => {
            cur.sort({ _id : 1 }).project({ 
                actor : 1, at : 1, type : 1, diffs : 1
            }).toArray((err, arr) => sendback(arr));
        });
    }

    parseSpecialValues(v) {
        v.date && (v.date = new Date(v.date));
        v.author && (v.author = db.mongoID(v.author));
        v.topic && (v.topic = db.mongoID(v.topic));
        v.media && (v.media = db.mongoID(v.media));
        v.sponsoredBoxLogo && (v.sponsoredBoxLogo = db.mongoID(v.sponsoredBoxLogo))
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
                            col.replaceOne({_id : postid}, newpost, {}, () => {
                                log('Content', 'Updated article with headline ' + newpost.title[0], 'success');
                                callback(undefined, entry);
                            });
                        } else {
                            log('Content', 'Did not update article (no diff) with headline ' + newpost.title[0], 'info');
                            callback();
                        }
                    });
                }
            });
        });
    }

    publish(_c, post, caller, callback) {
        const payload = { status : "published" };
        post.status = payload.status;

        if (!post.date) {
            payload.date = new Date();
            post.date = payload.date;
        }

        if (!post.name) {
            payload.name = require('slug')(post.title[0]).toLowerCase();
            post.name = payload.name;
        }

        if (!post.topic || !post.author || !post.media) {
            return callback({ error : "Missing fields", type : "fields" });
        }

        db.update(_c, 'content', { _id : post._id }, payload, () => {
            this.pushHistoryEntryFromDiff(_c, post._id, caller, diff({}, { status : "published" }), 'published', historyentry => {
                this.getFull(_c, post._id, fullpost => {
                    this.generate(_c, fullpost, () => {
                        callback({ historyentry, newstate : fullpost });
                    }, 'all');
                });
            });
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
                    reportee && db.findUnique(_c, 'content', { _id : postid }, (err, article) => {
                        require('./mail.js').triggerHook(_c, 'article_sent_for_review', reportee.email, {
                            to : reportee, 
                            article, contractor
                        });
                    });
                });
            });
        });
    }

    refuseSubmission(_c, postid, caller, callback) {
        db.update(_c, 'content', { _id : postid }, { status : "draft" }, () => {
            this.pushHistoryEntryFromDiff(_c, postid, caller, diff({}, { status : "draft" }), 'refused', historyentry => {
                this.getFull(_c, postid, newstate => callback && callback({ historyentry, newstate }));
            });
        });
    }

    unpublish(_c, postid, caller, callback) {
        db.update(_c, 'content', { _id : postid }, { status : "deleted" }, () => {
            this.getFull(_c, postid, fullpost => {
                this.pushHistoryEntryFromDiff(_c, postid, caller, diff({}, { status : "deleted" }), 'unpublished', historyentry => {
                    callback({ historyentry, newstate : fullpost });
                });

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

    destroy(_c, postid, caller, callback) {
        db.update(_c, 'content', { _id : postid }, { status : "destroyed" }, () => {
            this.getFull(_c, postid, fullpost => {
                this.pushHistoryEntryFromDiff(_c, postid, caller, diff({}, { status : "destroyed" }), 'destroyed', historyentry => {
                    callback({ historyentry, newstate : fullpost });
                });

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

    getPreview(_c, postid, payload, sendback) {
        payload = this.parseSpecialValues(payload);

        db.findUnique(_c, 'content', { _id : postid }, (err, post) => {
            const previewpost = {};
            Object.assign(previewpost, post, payload);

            db.findUnique(_c, 'topic', { _id : previewpost.topic }, (err, fulltopic) => {
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

                        const abspath  = _c.server.html + "/static/tmp/preview" + 
                            Math.random().toString().slice(2) + 
                            Math.random().toString().slice(2) + 
                            ".tmp";

                        filelogic.renderThemeLML3(_c, ctx, abspath, extra, (markup) => {
                            sendback(markup);
                        });
                    });
                });
            });
        });
    }
}

module.exports = new ContentLib();
