// Constants
const FACEBOOK_API = "https://graph.facebook.com/v";

// Libraries
const request = require('request');
const { presentableFacebookUser, makeToken } = require('./formatters');

const sessions = {};

// Endpoints
const endpoints = {
    "POST/DEBUG_FACEBOOK_TEST_HERE" : cli => {
        const token = cli.request.headers.t;
        const gurl = FACEBOOK_API + cli._c.dataserver.facebook.v + "/debug_token?access_token=" + cli._c.dataserver.facebook.token + "&input_token=" + token;
        
        request(gurl, {json : true}, (err, resp, r) => {
            cli.sendJSON(r);
        });
    },

    "POST/introduce" : cli => {
        const token = cli.request.headers.t;
        const gurl = FACEBOOK_API + cli._c.dataserver.facebook.v + "/debug_token?access_token=" + cli._c.dataserver.facebook.token + "&input_token=" + token;
        
        request(gurl, {json : true}, (err, resp, r) => {
            if (r && r.data && r.data.user_id) {
                const fbid = r.data.user_id;
                const _id = require('crypto').createHash('sha256').update(fbid).digest("hex");

                cli._c.db.collection('fbusers').find({ _id }).next((err, maybeuser) => {  
                    if (maybeuser) {
                        sessions[maybeuser.lmltk] = maybeuser;
                        cli.sendJSON(maybeuser);
                    } else {
                        const lmltk = makeToken(_id);
                        cli._c.db.collection('fbsessions').insertOne({ _id : lmltk, userid : _id, at : Date.now() });

                        request(FACEBOOK_API + cli._c.dataserver.facebook.v + `/${fbid}?access_token=${token}&fields=name,birthday,gender,email`, {json:true}, (err, resp, r) => {
                            const user = presentableFacebookUser(r, FACEBOOK_API + cli._c.dataserver.facebook.v + `/${fbid}/picture?height=320`, lmltk);
                            cli._c.db.collection('fbusers').insertOne(user, (err, r) => {
                                user.lmltk = lmltk;
                                sessions[lmltk] = user;
                                user.firstLogin = true;
                                cli.sendJSON(user);
                            });
                        })
                    }
                })
            } else {
                cli.throwHTTP(403);
            }
        });
    },

    "DELETE/introduce" : cli => {
        const deleted = delete sessions[cli.request.headers.lmltk];
        cli.sendJSON({deleted})
    },

    "GET/me" : cli => {
        const sesh = sessions[cli.request.headers.lmltk];
        sesh ? cli.sendJSON(sesh) : cli.throwHTTP(404);
    },

    "PUT/me" : cli => {
        cli.throwHTTP(501);
    },

    "DELETE/me" : cli => {
        const sesh = sessions[cli.request.headers.lmltk];
        if (!sesh) {
            cli.throwHTTP(404);
        } else {
            cli._c.db.collection('fbusers').removeOne({_id : sesh._id});
            const deleted = delete sessions[cli.request.headers.lmltk];
            cli.sendJSON({deleted});
        }
    },

    "PUT/pref" : cli => {

    },

    "GET/search" : cli => {

    },
};

// Handler wrappers
class Handlers {
    static handle(cli) {
        const endpoint = endpoints[cli.endpoint];
        if (endpoint) {
            endpoint(cli);
        } else {
            cli.throwHTTP(404);
        }
    }

    static preload(db) {
        const cur = db.collection('fbsessions').aggregate([{ $lookup : {
            from : "fbusers",
            as : "user",
            localField : "userid",
            foreignField : "_id"
        } }]); 

        const next = () => {
            cur.next((err, s) => {
                if (s) {
                    sessions[s._id] = s.user[0];
                    setTimeout(next, 0);
                }
            });
        }

        next();
    }
}

module.exports = Handlers;
