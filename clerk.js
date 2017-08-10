const log = require('./log.js');
const db = require('./includes/db.js');
const sharedcache = require('./sharedcache');

/*
[Session auth flow] : {
    // Wrapped in theme library
    "create" : [
        "Throttle request to protect against DDOS attacks",
        "Validate Facebook login",
        "Create session in shared memory",
        "Create copy in database with facebookid and hashed sessionid indices",
        "Send user a copy of the sessionid as a response JSON",
        "Client stores that sessionid in the cookies using Javascript"
    ],

    // Wrapped in client side Javascript library
    "request" : [
        "Client pulls out cookie, hashes it, then sends it to server as HTTP header",
        "Server received both the cookie and header",
        "Server pulls out from shared memory using combination of both",
        "Server authenticated the user, or refuses the request"
    ]
}
 */

const CLERK_HEADER_NAME = "LML-CLERK-HANDSHAKE".toLowerCase();
const CLERK_DOUBLE_NAME = "LML-CLERK-AWESOME".toLowerCase();
const CLERK_COOKIE_NAME = "clerksid";

class Clerk {
    register(cli, done) {
        
    }

    greet(cli, done) {
        let hash = cli.request.headers[CLERK_HEADER_NAME];
        let sid = cli.cookies[CLERK_COOKIE_NAME];
        let doubletwist = cli.request.headers[CLERK_DOUBLE_NAME];

        if (!hash || !sid || !doubletwist) {
            return cli.throwHTTP(404, undefined, true);
        } 

        sharedcache.clerk(sid + hash, "get", {}, (response) => {
            if (!response || !response.session) {
                return cli.throwHTTP(401, undefined, true);
            }

            cli.session = session;
            done(true);
        });
    }

    serve(cli) {
        cli.sendJSON(cli.session);
    }
}

module.exports = new Clerk();
