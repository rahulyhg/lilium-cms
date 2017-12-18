const db = require('./includes/db');
const config = require('./config');
const filelogic = require('./filelogic');
const log = require('./log');
const hooks = require('./hooks');

const CONTENT_COLLECTION = 'content';

class ContentLib {
    create(_c, title, author, done) {
        db.findUnique(config.default(), 'entities', { _id : author }, (err, authorentity) => {
            log('Content', 'Entity ' + authorentity.displayname + ' is creating an article with original title : ' + title, 'info');

            const art = {
                title : [title],
                subtitle : [""],
                content : [""],
                author : author, 
                createdBy : author, 
                subscribers : [author],
                type : "post",
                status : "draft",
                updated : new Date(),
                createdOn : new Date()
            };

            authorentity.reportsto && authorentity.reportsto.length > 0 && art.subscribers.push(...authorentity.reportsto)

            db.insert(_c, CONTENT_COLLECTION, art, (err, result) => {
               done(err, art);
            });
        }, {reportsto : 1, displayname : 1});
    }

    generate(_c, deepArticle, cb, pageIndex) {
        let extra = {};
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

        let ctx = deepArticle.templatename || deepArticle.topic.articletemplate || "article";
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
