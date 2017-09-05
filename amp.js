const db = require('./includes/db.js');
const endpoints = require('./endpoints.js');
const article = require('./article.js');
const filelogic = require('./filelogic.js');
const fileserver = require('./fileserver.js');
const log = require('./log.js');
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
        if (!article) {
            return cli.throwHTTP(404, undefined, true);
        }

        let articleContent = article.content;

        log('AMP', 'Preparing for parsing content');
        /* Modify content according to AMP guidelines */

        // Featured image
        if (!article.featuredimage[0]) {
            article.featuredimage = [{sizes : {narcityfeatured : {url : ""}}}];
        }

        article.featuredimage[0].sizes.narcityfeatured.url = article.featuredimage[0].sizes.narcityfeatured.url.replace (
            cli._c.server.url, 
            cli._c.content.cdn.domain
        );
        
        // Avatar URL
        article.authors[0].avatarURL = article.authors[0].avatarURL.replace(
            cli._c.server.url, 
            cli._c.content.cdn.domain
        );
        
        // Sponsored Logo
        if (article.sponsoredBoxLogoURL) {
            article.sponsoredBoxLogoURL = article.sponsoredBoxLogoURL.replace(
                cli._c.server.url, 
                cli._c.content.cdn.domain
            );
        }

        this.parseAMPContent(cli, articleContent, (err, amp) => {
            if (err) {
                return cli.throwHTTP(500, undefined, true);
            }

            article.content = amp;

            log('AMP', "Generating AMP page from LML for article : " + article.title);
            filelogic.renderThemeLML(cli, 'amp', 'amp/' + article.name + '.html', {
                config : cli._c,
                article : article
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

    parseAMPContent(cli, articleContent, cb) {
        const dom = new JSDOM.JSDOM('<html><head></head><body>' + articleContent + '</body></html>');        
        const images = dom.window.document.querySelectorAll('img');

        for (let i = images.length - 1; i >= 0; i--) {
            const x = images[i];
            if (x.src && x.src.includes('cdninstagram')) {
                const ampimg = dom.window.document.createElement("amp-img");
                ampimg.setAttribute('src', cdn.parseOne(cli._c, cli._c.server.protocol + cli._c.server.url + "/instagram?u=" + x.src));
                ampimg.setAttribute('width', 640);
                ampimg.setAttribute('height', 640);
                ampimg.setAttribute('layout', "responsive");

                try {
                    dom.window.document.body.insertBefore(ampimg, x.parentElement);
                    x.remove();
                } catch (ex) {}
            }
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
                if (vid.includes('/')) {
                    vid = vid.substring(0, vid.indexOf('/'));
                }

                const youtube = dom.window.document.createElement('amp-youtube');
                youtube.dataset.videoid = vid;
                youtube.setAttribute('width', '640');
                youtube.setAttribute('height', '480');
                youtube.setAttribute('layout', 'responsive');

                try {
                    dom.window.document.body.insertBefore(youtube, x.parentElement);
                    x.remove();
                } catch (ex) {}
            }
        }

        cdn.parse(dom.window.document.body.innerHTML, cli, (articleContent) => {
            articleContent = articleContent.replace(/<ad><\/ad>/g, "");

            cb(undefined, articleContent);
        });
    }
}
module.exports = new Amp();
