const db = require('./includes/db.js');
const endpoints = require('./endpoints.js');
const article = require('./article.js');
const filelogic = require('./filelogic.js');
const fileserver = require('./fileserver.js');
const log = require('./log.js');

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

        /* Modify content according to AMP guidelines */
        article.content = this.parseAMPContent(articleContent);

        /* TODO : Modify amp.lml so that it creates an AMP page */
        // String parsing can be heavy on CPU usage. Make sure it's optimized! 

        log('AMP', "Generating AMP page for article : " + article.title);
        filelogic.renderThemeLML(cli, 'amp', 'amp/' + article.name + '.html', {
            config : cli._c,
            article : article
        }, () => {
            fileserver.pipeFileToClient(cli, cli._c.server.html + "/amp/" + article.name + '.html', () => {
                log("AMP", "Generated AMP page for article : " + article.title);
            }, true, 'text/html');
        }, true);
    };

    parseAMPContent(articleContent) {
        // TODO : Do that parsing, yay! 
        articleContent = articleContent;

        // Return the whole thing
        return articleContent;
    }
}

module.exports = new Amp();
