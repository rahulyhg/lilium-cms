const AMPlib = require('../lib/amp');
const articleLib = require('../content.js');

class AMPController {
    GET(cli) {
        // Contains the article name from the URL
        let articleName = cli.routeinfo.path[cli.routeinfo.path.length - 1];

        // Will try to find the article in the database
        articleLib.getFull(
            cli._c, 
            undefined, 
            article => AMPlib.handleArticle(cli, article), 
            {
                name : articleName, 
                status : "published"
            }
        );
    }
}

module.exports = new AMPController();
