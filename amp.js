const db = require('./includes/db.js');
const endpoints = require('./endpoints.js');
const article = require('./article.js');
const filelogic = require('./filelogic.js');
const fileserver = require('./fileserver.js');
const log = require('./log.js');
const hooks = require('./hooks.js');
const cdn = require('./cdn.js');
const themes = require('./themes.js');

const JSDOM = require('jsdom'); 

class Amp {
    // Called from Riverflow
    GET(cli) {
        // Contains the article name from the URL
        let articleName = cli.routeinfo.path[cli.routeinfo.path.length - 1];

        // Will try to find the article in the database
        article.deepFetch(cli._c, articleName, (article) => {this.handleArticle(cli, article);}, false, {status : "published"});
    }

    handleArticle(cli, article) {
        // Article is undefined if nothing was found
        if (!article || !article.authors || !article.authors[0] || !article.title || !article.title[0] || !article.topic) {
            return cli.throwHTTP(404, undefined, true);
        }

        let articleContent = article.content.shift();

        article.content.forEach((page, index) => {
            if (article.title[index+1].indexOf(article.title[0]) == -1) {
                articleContent += `<h3 class="page-sep">${article.title[index+1]}</h3>`
            }

            if (article.subtitle[index+1].indexOf(article.subtitle[0]) == -1) {
                articleContent += `<h4 class="page-sep-sub">${article.subtitle[index+1]}</h4>`
            }

            articleContent += page;
        });

        article.title = article.title[0];
        article.subtitle = article.subtitle[0];

        log('AMP', 'Preparing for parsing content');
        /* Modify content according to AMP guidelines */

        // Featured image
        if (!article.featuredimage[0]) {
            article.featuredimage = [{sizes : {facebook : {url : ""}}}];
        } else if (!article.featuredimage[0].sizes.facebook) {
            article.featuredimage[0].sizes.facebook = article.featuredimage[0].sizes.content;
        }

        article.featuredimage[0].sizes.facebook.url = article.featuredimage[0].sizes.facebook.url.replace (
            cli._c.server.url, 
            cli._c.content.cdn.domain
        );
        
        // Avatar URL
        if (article.authors[0].avatarURL) {
            article.authors[0].avatarURL = article.authors[0].avatarURL.replace(
                cli._c.server.url, 
                cli._c.content.cdn.domain
            );
        } else {
            article.authors[0].avatarURL = cli._c.server.protocol + cli._c.content.cdn.domain + "/static/media/lmllogo.png";
        }
        
        // Sponsored Logo
        if (article.sponsoredBoxLogoURL) {
            article.sponsoredBoxLogoURL = article.sponsoredBoxLogoURL.replace(
                cli._c.server.url, 
                cli._c.content.cdn.domain
            );
        }

        this.parseAMPContent(cli, article, articleContent, (err, amp) => {
            if (err) {
                return cli.throwHTTP(500, undefined, true);
            }

            article.content = amp;

            let language = cli._c.website.language;
            if (article.topic && article.topic.override && article.topic.override.language) {
                language = article.topic.override.language;
            }


            log('AMP', "Generating AMP page from LML for article : " + article.title);
            filelogic.renderThemeLML3(cli, 'amp', 'amp/' + article.name + '.html', {
                config : cli._c,
                article, language 
            }, (filecontent) => {
                log("AMP", "Generated AMP page for article : " + article.title);
                cli.response.writeHead(200);
                cli.response.end(filecontent);

                fileserver.dumpToFile(cli._c.server.html + "/amp/" + article.name + ".html", filecontent, () => {
                    log("AMP", "Cached file written");
                }, 'utf8');
            }, true);
        });
    };

    parseAMPContent(cli, article, articleContent, cb) {
        const dom = new JSDOM.JSDOM('<html><head></head><body>' + articleContent + '</body></html>');        
        const images = dom.window.document.querySelectorAll('img');

        for (let i = images.length - 1; i >= 0; i--) {
            const x = images[i];
            const ampimg = dom.window.document.createElement("amp-img");

            if (x.classList.contains("lml-instagram-avatar-3")) {
                ampimg.setAttribute('width', 24);
                ampimg.setAttribute('height', 24);
                ampimg.setAttribute('layout', "fixed");
                ampimg.setAttribute('src', cdn.parseOne(cli._c, cli._c.server.protocol + cli._c.server.url + "/instagram?u=" + x.src));

                x.parentElement.insertBefore(ampimg, x);
                x.remove();

                continue;
            } else if (x.src && x.src.includes("instagram")) {
                ampimg.setAttribute('src', cdn.parseOne(cli._c, cli._c.server.protocol + cli._c.server.url + "/instagram?u=" + x.src));
            } else if (x.src && (x.src.includes('uploads') || x.src.includes("/u/"))) { 
                let source = x.src;
                if (source.startsWith('//')) {
                    source = cli._c.server.protocol + source;
                }

                ampimg.setAttribute('src', cdn.parseOne(cli._c, source));
            } else if (x.src && x.src.startsWith('http:')) {
                ampimg.setAttribute('src', "https" + x.src.substring(4));
            }

            ampimg.setAttribute('width', x.dataset.width || 640);
            ampimg.setAttribute('height', x.dataset.height || 640);
            ampimg.setAttribute('layout', "responsive");
            ampimg.getAttribute('src') && x.parentElement.insertBefore(ampimg, x);

            x.remove();
        }

        const scripts = dom.window.document.querySelectorAll('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
            scripts[i].remove();
        }

        const videos = dom.window.document.querySelectorAll('.ck-embed-video');
        for (let i = videos.length - 1; i >= 0; i--) {
            const x = videos[i];
            if (x.src.includes('youtube.com')) {
                let vid = x.src.substring(x.src.indexOf('/embed/') + 7);
                if (vid.includes('/')) { vid = vid.substring(0, vid.indexOf('/')); }
                if (vid.includes('?')) { vid = vid.substring(0, vid.indexOf('?')); }
                if (vid.includes('&')) { vid = vid.substring(0, vid.indexOf('&')); }

                const youtube = dom.window.document.createElement('amp-youtube');
                youtube.setAttribute('data-videoid', vid);
                youtube.setAttribute('width', '640');
                youtube.setAttribute('height', '480');
                youtube.setAttribute('layout', 'responsive');

                try {
                    x.parentElement.insertBefore(youtube, x);
                    x.remove();
                } catch (ex) { log('AMP', 'Could not remove iframe : ' + ex.stack || ex, 'warn');}
            }
        }

        // Slow
        const styled = dom.window.document.querySelectorAll("[style]");
        for (let i = styled.length - 1; i >= 0; i--) { styled[i].removeAttribute('style'); }

        const mousedown = dom.window.document.querySelectorAll("[onmousedown]");
        for (let i = mousedown.length - 1; i >= 0; i--) { mousedown[i].removeAttribute('onmousedown'); }

        const clicked = dom.window.document.querySelectorAll("[onclick]");
        for (let i = clicked.length - 1; i >= 0; i--) { clicked[i].removeAttribute('onclick'); }

        const parags = dom.window.document.querySelectorAll('p');
        for (let i = parags.length - 1; i >= 0; i--) { parags[i].removeAttribute('contenteditable'); }

        const iframes = dom.window.document.querySelectorAll('iframe');
        for (let i = iframes.length - 1; i >= 0; i--) { 
            const iframe = iframes[i];
            const ampframe = dom.window.document.createElement('amp-iframe');
            ampframe.setAttribute('width', iframe.width);
            ampframe.setAttribute('height', iframe.height);
            ampframe.setAttribute('src', iframe.src);
            ampframe.setAttribute('layout', "responsive");
            ampframe.setAttribute('frameborder', 0);
            ampframe.setAttribute('sandbox', "allow-script");

            iframe.parentElement.insertBefore(ampframe, iframe);
            iframe.remove();
        }

        cdn.parse(dom.window.document.body.innerHTML, cli, (articleContent) => {
            themes.fetchCurrentTheme(cli._c, cTheme => {
                let articlewrap = { content : articleContent };

                let language = cli._c.website.language;
                if (article.topic && article.topic.override && article.topic.override.language) {
                    language = article.topic.override.language;
                }
                let lang = language.split('-')[0];

                db.find(cli._c, 'ads', { type : "amp", lang }, [], (err, cur) => {
                    cur.sort({_id : 1}).toArray((err, ads) => {
                        hooks.fire("amp_replace_ads_" + cli._c.uid, { article : articlewrap, dom : dom, theme : cTheme, lang, ads });
                        articleContent = articlewrap.content;
                        articleContent = articleContent.replace('<lml-related></lml-related>', '').replace(/style=/g, "amp-style=");

                        cb(undefined, articleContent);
                    });
                });
            });
        });
    }
}
module.exports = new Amp();
