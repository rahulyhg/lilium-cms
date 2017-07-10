const db = require('./includes/db.js');
const endpoints = require('./endpoints.js');
const article = require('./article.js');
const filelogic = require('./filelogic.js');
const fileserver = require('./fileserver.js');
const log = require('./log.js');
const themes = require('./themes.js');

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

        this.parseAMPContent(cli, article, articleContent, (err, amp) => {
            if (err) {
                return cli.throwHTTP(500, undefined, true);
            }

            log('AMP', 'Done parsing HTML to AMP');
            article.content = amp;
            article.has_instagram = article.content.indexOf("<amp-instagram") != -1;        
            article.has_twitter = article.content.indexOf("<amp-twitter") != -1;

            /* Load theme AMP context, then generate from LML file */
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

    parseAMPContent(cli, article, articleContent, cb) {
        if (cli._c.content.cdn && cli._c.content.cdn.domain) {
            articleContent = articleContent.replace(
                new RegExp('(src=")' + cli._c.server.url, "g"), 
                '$1' + cli._c.content.cdn.domain
            );
        }
        articleContent = articleContent.replace(/(src=")(\/\/)/g, '$1' + cli._c.server.protocol + '//');
        
        var cTheme = themes.getEnabledTheme(cli._c).settings;
        var adtags = (article.topic && article.topic.override && article.topic.override.adtags) || cTheme.adtags || {};
        var keys = Object.keys(adtags);
        for(var i = 0; i < keys.length; i++){
            articleContent = articleContent.replace("<ad><\/ad>", '<p>{ad}</p>');
        }
        articleContent = articleContent.replace(/<ad><\/ad>/g, "");

        const htmlToAmp = require('html-to-amp')();

        // Use library to do most of the parsing
        log("AMP", "Running htmlToAmp library");
        htmlToAmp(articleContent, (err, amp) => {
            log("AMP", "Library called back");
            if(!err) {
                // Replace LML ads with AMP ads
                amp = amp.replace(
                    /<p>\{ad\}<\/p>/g,
                    '<div class="ad-section">'+
                    '<amp-ad width=300 height=250 ' +
                    'type="doubleclick" ' +
                    'data-slot="/1020360/amp-bb-before-content">' +
                    '</amp-ad>' +
                    '</div>');
            } 
            
            cb(err, amp);
        });
    }
}
module.exports = new Amp();
