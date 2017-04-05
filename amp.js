const db = require('./includes/db.js');
const endpoints = require('./endpoints.js');
const article = require('./article.js');
const filelogic = require('./filelogic.js');
const fileserver = require('./fileserver.js');
const log = require('./log.js');

const setupHtmlToAmp  = require('html-to-amp');
const htmlToAmp = setupHtmlToAmp();

class Amp {
    // Called inside core.js
    GET(cli) {
        // Contains the article name from the URL
        let articleName = cli.routeinfo.path[1];

        // Will try to find the article in the database
        article.deepFetch(cli._c, articleName, (article) => {this.handleArticle(cli, article);}, false, {status : "published"});
    }

    handleArticle(cli, article) {
        // Article is undefined if nothing was found
        if (!article) {
            return cli.throwHTTP(404, 'NOT FOUND', true);
        }

        let articleContent = article.content;

        log('AMP', 'before parsing');
        /* Modify content according to AMP guidelines */
        article.featuredimage[0].sizes.narcityfeatured.url = 
            article.featuredimage[0].sizes.narcityfeatured.url.replace(
                cli._c.server.url, cli._c.content.cdn.domain);
        article.authors[0].avatarURL = 
            article.authors[0].avatarURL.replace(cli._c.server.url, cli._c.content.cdn.domain);
        if(article.sponsoredBoxLogoURL){
            article.sponsoredBoxLogoURL =
                article.sponsoredBoxLogoURL.replace(cli._c.server.url, cli._c.content.cdn.domain);
        }

        this.parseAMPContent(cli, articleContent, (err, amp) => {
            log('AMP', 'Done parsing HTML to AMP: ', err);
            if (err) {
              throw err;
            }

            article.content = amp;
            /* Modify amp.lml so that it creates an AMP page */
            log('AMP', "Generating AMP page for article : " + article.title);
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
      if (cli._c.content.cdn && cli._c.content.cdn.domain) {
        articleContent = articleContent.replace(
              new RegExp('(src=")' + cli._c.server.url, "g"), 
              '$1' + cli._c.content.cdn.domain);
      }
      articleContent = articleContent.replace(/(src=")(\/\/)/g, '$1' + cli._c.server.protocol + '//');
      articleContent = articleContent.replace(/<ad><\/ad>/g, '<p>{ad}</p>');
      
      return htmlToAmp(articleContent, (err, amp) => {
                          if(!err) {
                              amp = amp.replace(/<p>\{ad\}<\/p>/g,
                                                '<div class="ad-section">'+
                                                    '<amp-ad width=300 height=250 ' +
                                                            'type="doubleclick" ' +
                                                            'data-slot="/1020360/amp-bb-before-content">' +
                                                    '</amp-ad>' +
                                                '</div>');
                            } cb(err, amp);
                          }
                        );
    }
}
module.exports = new Amp();
