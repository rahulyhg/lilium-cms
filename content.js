const db = require('./includes/db');
const config = require('./config');
const filelogic = require('./filelogic');
const log = require('./log');
const hooks = require('./hooks');

const CONTENT_COLLECTION = 'content';
const ENTITY_COLLECTION = 'entities';

const LOOKUPS = {
    media : { from : "uploads", as : "deepmedia", localField : "media", foreignField : "_id" },
    topic : { from : "topics", as : "fulltopic", localField : "topic", foreignField : "_id" }
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

    generate(_c, deepArticle, cb, pageIndex) {
        let extra = {};
        extra.ctx = "article";
        extra.article = deepArticle;
        extra.topic = deepArticle.topic;

        if (!extra.topic) {
            log('Content', 'Cannot generate article without a topic, ID : ' + (deepArticle && deepArticle._id), 'warn');
            return cb && cb(new Error("Cannot generate article without a topic"));
        }

        if (deepArticle.topic && deepArticle.topic.override && deepArticle.topic.override.language) {
            extra.language = deepArticle.topic.override.language;
        }

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

                        cb({
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
                    cb && cb({
                        success: true,
                        deepArticle : deepArticle
                    });
                });
            }
        };

        nextHook();
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

    getFull(_c, _id, sendback, match = {}) {
        const $match = match;
        $match._id = db.mongoID(_id);

        db.join(_c, CONTENT_COLLECTION, [
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
                post.author = author;
                post.headline = post.title[0];
                post.url = post.fulltopic && post.name && (_c.server.protocol + _c.server.url + "/" + post.fulltopic.completeSlug + "/" + post.name);

                sendback(post);
            }, { displayname : 1, username : 1, avatarURL : 1, avatarMini : 1, slug : 1, revoked : 1 });
        });
    }

    update() {

    }

    publish() {

    }

    sendForReview() {
    
    }

    unpublish() {

    }

    preview() {

    }

    destroy() {

    }
}

module.exports = new ContentLib();
