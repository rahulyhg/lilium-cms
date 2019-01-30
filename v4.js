const path = require('path');
const makeIndex = require(path.join(global.liliumroot || __dirname, "apps", "lilium", "index.html"));
const db = require('./includes/db');
const cachefront = require('./cachefront');

class V4 {
    serveV4Index(cli) {
        cli.response.writeHead(200, { "Content-Type" : "text/html" });
        cli.response.end(makeIndex(cli));
    }

    dumpV3UrlInFront(_c, done) {
        const nextPost = cur => {
            cur.next((err, post) => {
                if (!post) {
                    return done && done();
                }
        
                if (post.v3url == post.url) {
                    setImmediate(() => nextPost(cur));
                } else {
                    cachefront.setURL(post.v3url, undefined, undefined, undefined, () => {
                        setImmediate(() => nextPost(cur));
                    }, {
                        status : 301,
                        headers : {
                            Location : post.v4url
                        }
                    });
                }
            });
        };

        db.find(_c, 'content', { v3url : { $exists : 1 }, url : { $exists : 1 } }, [], (err, cur) => {
            nextPost(cur);
        }, { v3url : 1, url : 1 });
    }

    updateV3Redirection(v3url, url) {
        cachefront.setURL(v3url, undefined, undefined, undefined, () => { }, {
            status : 301,
            headers : {
                Location : url
            }
        });
    }
}

module.exports = V4;
