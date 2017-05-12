const _salt   = "2d8986439b60edad9af758e01cc0abb10b7dcdd72f0797596d567c73011607da";
const _pepper = "113462c66d8afa0830cb3e976f9562671a0875dff7d35aa51466539451972108";
const userGraphFields = ["name", "first_name", "email", "gender", "birthday", "age_range", "verified", "relationship_status"];
const userGraphFieldsString = userGraphFields.join(',');

class NarcityReadersWrapper {
    constructor(_c) {
        this._c = _c;
    }

    initialize() {
        return this.loadLibs().registerEndpoints();
    }

    createCollection(done) {
        this.libs["includes/db"].createCollection(this._c, 'loggedusers', done);
    }

    loadLibs(lib) {
        const load = (name) => {
            this.libs[name] = require(this._c.server.base + name + ".js");
        }
        
        this.libs = {};
        load("fileserver");
        load("endpoints");
        load("log");
        load("includes/db");

        return this;
    }

    registerEndpoints() {
        this.libs.endpoints.register(this._c.id, 'whoami', 'GET', this.replyToWhoAmI.bind(this));
        this.libs.endpoints.register(this._c.id, 'auth', 'GET', this.receiveAuth.bind(this));
        this.libs.endpoints.register(this._c.id, 'bye', 'GET', this.receiveBye.bind(this));

        return this;
    }

    replyToWhoAmI(cli) {
        let cookievalue = cli.cookies.lmllove;
        if (!cookievalue) {
            cli.response.writeHead(204);
            cli.response.end();
        } else {
            let filepath = cli._c.server.html + "/whoami/" + cookievalue + ".json";
            this.libs.fileserver.fileExists(filepath, exists => {
                if (exists) {
                    this.libs.fileserver.pipeFileToClient(cli, filepath, () => {
                        // Piped JSON file to client
                    }, true, "application/json");
                } else {
                    cli.response.writeHead(204);
                    cli.response.end();
                }
            });
        }
    }

    validateFacebookToken(_c, inputToken, sendback) {
        let graph = "https://graph.facebook.com/v" + _c.social.facebook.apiversion + 
            "/debug_token?input_token=" + inputToken + 
            "&access_token=" + _c.social.facebook.privtoken;

        console.log(graph);
        require('request')(graph, (err, response, body) => {
            if (!err) {
                let fromFB = JSON.parse(body);
                sendback(fromFB.error, fromFB);
            } else {
                sendback(err);
            }
        });
    }

    getPublicInformation(userid, sendback) {
        let graph = "https://graph.facebook.com/v" + this._c.social.facebook.apiversion +
            "/" + userid + "?fields=" + userGraphFieldsString + 
            "&access_token=" + this._c.social.facebook.privtoken; 
        let fields = userGraphFields;

        require('request')(graph, (err, response, body) => {
            body = JSON.parse(body);
            body.fbid = userid;
            sendback(body);
        });
    }

    createJSONSession(token, appid, userid, sendback) {
        let that = this;
        this.libs["includes/db"].findUnique(this._c, 'loggedusers', {fbid : userid}, (err, user) => {
            let cookie = that.generateHash(appid, userid);

            if (user) {
                user._id = undefined;
                that.libs.fileserver.dumpToFile(that._c.server.html + "/whoami/" + cookie + ".json", JSON.stringify(user), () => {
                    sendback(user, cookie);
                }, 'utf8');
            } else {
                that.getPublicInformation(userid, (newuser) => {
                    that.libs.fileserver.dumpToFile(that._c.server.html + "/whoami/" + cookie + ".json", JSON.stringify(newuser), ()=>{
                        that.libs["includes/db"].insert(this._c, 'loggedusers', newuser, () => {
                            newuser.created = true;
                            sendback(newuser, cookie);
                        });
                    });
                });
            }
        });
    }

    generateHash(appid, userid) {
        return require('crypto-js').SHA512(_pepper + appid + userid + _salt).toString(require("crypto-js").enc.Hex)
    }

    receiveAuth(cli) {
        let that = this;
        let usertoken = cli.routeinfo.params.accessToken;
        let userid = cli.routeinfo.params.userID;

        if (usertoken && userid) {
            this.validateFacebookToken(cli._c, usertoken, (err, resp) => {
                if (!err && resp.data.user_id == userid) {
                    that.createJSONSession(usertoken, resp.data.app_id, userid, (session, cookie) => {
                        cli.response.writeHead(200, {
                            'Set-Cookie' : "lmllove=" + cookie,
                            'Content-Type' : "application/json"
                        });
                        cli.response.end(JSON.stringify(session));
                    });
                } else {
                    cli.throwHTTP(404, null, true);
                }
            });
        } else {
            cli.throwHTTP(404, null, true);
        }
    }

    receiveBye(cli) {

    }
}

module.exports = NarcityReadersWrapper;
