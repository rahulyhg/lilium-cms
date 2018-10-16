const path = require('path');
const makeIndex = require(path.join(global.liliumroot || __dirname, "apps", "lilium", "index.html"));

class V4 {
    static serveV4Index(cli) {
        cli.response.writeHead(200, { "Content-Type" : "text/html" });
        cli.response.end(makeIndex(cli));
    }
}

module.exports = V4;
