// Constants
const FACEBOOK_API = "https://graph.facebook.com/v";

// Libraries
const request = require('request');
const { presentableFacebookUser, presentableGoogleUser, makeToken, mongoID, readPostData } = require('./formatters');
const Projections = require('./projection');
const fs = require('fs');

const sessions = {};
const SLUGTOID_CACHE = {};
const STATICPAGES = {};

// Endpoints
const endpoints = {
    "POST/DEBUG_FACEBOOK_TEST_HERE" : cli => {
        const token = cli.request.headers.t;
        const gurl = FACEBOOK_API + cli._c.dataserver.facebook.v + "/debug_token?access_token=" + cli._c.dataserver.facebook.token + "&input_token=" + token;
        
        request(gurl, {json : true}, (err, resp, r) => {
            cli.sendJSON(r);
        });
    },

    "POST/DEBUG_GOOGLE_TEST_HERE" : cli => {
        const token = cli.request.headers.t;
        const gurl = "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + token;
        readPostData(cli, data => {
            request(gurl, {json : true}, (err, resp, r) => {
                cli.sendJSON({
                    googleresponse : r,
                    sentpostdata : data
                });
            })
        })
    },

    "GET/staticpage" : cli => {
        const slug = cli.path[1];
        if (!slug) {
            cli.throwHTTP(404);
        } else if (STATICPAGES[slug]) {
            cli.response.writeHead(200, {"Content-Type" : "text/html"});
            cli.response.end(STATICPAGES[slug]);
        } else {
            cli._c.db.collection('styledpages').findOne({ slug }, (err, page) => {
                if (page) {
                    STATICPAGES[slug] = page.content;
                    cli.response.writeHead(200, {"Content-Type" : "text/html"});
                    cli.response.end(page.content); 
                } else {
                    cli.throwHTTP(404);
                }
            });
        }
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

    "POST/gintroduce" : cli => {
        const token = cli.request.headers.t;
        const gurl = "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + token;

        request(gurl, {json : true}, (err, resp, r) => {
            if (r && r.user_id) {        
                const gid = r.user_id;
                const _id = require('crypto').createHash('sha256').update(gid).digest("hex"); 
                
                cli._c.db.collection('fbusers').find({ _id }).next((err, maybeuser) => {  
                    if (maybeuser) {
                        sessions[maybeuser.lmltk] = maybeuser;
                        cli.sendJSON(maybeuser);
                    } else {
                        const lmltk = makeToken(_id);
                        cli._c.db.collection('fbsessions').insertOne({ _id : lmltk, userid : _id, at : Date.now() });

                        readPostData(cli, u => {
                            try {
                                u = JSON.parse(u);
                                const user = presentableGoogleUser(u, lmltk);

                                if (u.accessToken && u.id) {
                                    cli._c.db.collection('fbusers').insertOne(user, (err, r) => {
                                        user.lmltk = lmltk;
                                        sessions[lmltk] = user;
                                        cli.sendJSON(user);
                                    });
                                } else {
                                    console.log(u);
                                    cli.throwHTTP(401);
                                }
                            } catch (err) {
                                cli.throwHTTP(500);
                            }
                        });
                    }
                })                
            } else {
                console.log(r);
                cli.throwHTTP(404);
            }
        })
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

    "GET/urltoid" : cli => {
        const url = cli.request.headers.urltoid;
        const split = url.split('/');
        let slug = split[split.length - 1];
        
        if (!slug) {
            cli.throwHTTP(404);
        } else if (SLUGTOID_CACHE[slug]) {
            cli.sendJSON({_id : SLUGTOID_CACHE[slug]});
        } else {
            cli._c.db.collection('content').findOne({name : slug}, {projection : {_id : 1}}, (err, art) => {
                if (art) {
                    SLUGTOID_CACHE[slug] = art._id;
                    cli.sendJSON(art);
                } else {
                    cli.throwHTTP(404);
                }
            });
        }
    },

    "DELETE/me" : cli => {
        const sesh = sessions[cli.request.headers.lmltk];

        if (sesh) {
            cli._c.db.collection('fbusers').removeOne({_id : sesh._id});

            const deleted = delete sessions[cli.request.headers.lmltk];
            cli.sendJSON({deleted});
        } else {
            cli.throwHTTP(404);
        }
    },

    "GET/fav" : cli => {
        const sesh = sessions[cli.request.headers.lmltk];
        if (sesh) {
            const index = Math.abs(cli.request.headers.index || 0);
            cli._c.db.collection('fbusersfav').aggregate([
                { $match : { userid : sesh._id } },
                { $sort : { at : -1 } },
                { $skip : (index * 100) },
                { $limit : 100 },
                { $lookup : { from : "content", as : "article", localField : "_id", foreignField : "_id" } },
                { $unwind : "$article" },
                { $match : { "article.status" : "published" } },
                { $lookup : { from : "uploads", as : "article.media", localField : "article.media", foreignField : "_id" }},
                { $unwind : "$article.media" },
                { $project : Projections.favouriteList }
            ]).toArray((err, arr) => {
                cli.sendJSON({posts : arr, index, payloadsize : 100, err});
            })
        } else {
            cli.throwHTTP(404);
        }
    },

    "POST/fav" : cli => {
        const sesh = sessions[cli.request.headers.lmltk];
        if (sesh) {
            cli._c.db.collection('fbusersfav').insertOne({
                _id : mongoID(cli.request.headers.cid),
                userid : sesh._id,
                at : Date.now()
            }, (err, r) => {
                const _id = err ? "" : r.insertedId;
                cli.sendJSON({ favid : _id });
            });
        } else {
            cli.throwHTTP(404);
        }       
    },

    "DELETE/fav" : cli => {
        const sesh = sessions[cli.request.headers.lmltk];
        if (sesh) {
            cli._c.db.collection('fbusersfav').removeOne({
                _id : mongoID(cli.request.headers.cid)
            }, (err, r) => {
                cli.sendJSON({ r });
            });
        } else {
            cli.throwHTTP(404);
        }              
    },

    "PUT/pref" : cli => {
        const sesh = sessions[cli.request.headers.lmltk];
        if (sesh) {
            readPostData(cli, dat => {
                const feedtype = cli.request.header.feedtype || "full";
                const language = cli.request.header.language || "all";

                if (dat || feedtype == "all") {
                    const topics = dat && dat.trim().split(',').map(x => ObjectID(x));
                    const $set = {
                        feedtype, topics, language
                    };

                    cli._c.db.collection('fbusersfav').updateOne({
                        _id : mongoID(cli.request.headers.cid)
                    }, {
                        $set 
                    }, (err, r) => {
                        cli.sendJSON({ r });
                    });
                } else {
                    cli.throwHTTP(401);
                }
            });
        } else {
            cli.throwHTTP(404);
        }           
    },

    "GET/search" : cli => {
        const sesh = sessions[cli.request.headers.lmltk];
        const terms = cli.request.headers.terms;

        if (sesh && terms) {
            cli._c.db.collection('content').aggregate([
                { $match : { status : "published", $text : { $search : '"' + decodeURI(terms).trim().split(' ').join('" "') + '"' } } },
                { $sort : { score: { $meta: "textScore" } } },
                { $limit : 30 },
                { $lookup : { from : "uploads", as : "media", localField : "media", foreignField : "_id" }},
                { $lookup : { from : "topics", as : "fulltopic", localField : "topic", foreignField : "_id" }},
                { $unwind : "$fulltopic" },
                { $project : Projections.searchResults },
                { $unwind : "$facebookmedia" }
            ]).toArray((err, arr) => {
                cli.sendJSON({ posts : arr });
            });
        } else {
            cli.throwHTTP(404);
        }   
    },

    "GET/all" : cli => {
        cli.response.writeHead(200, { "Content-Type" : "application/json"});
        const st = fs.createReadStream(cli._c.server.html + "/all.json", {encoding : "utf8"});
        st.on('end', () => { st.destroy(); });
        st.pipe(cli.response);
    },

    "GET/content" : cli => {
        console.log(cli._c.server.html + "/content/" + cli.path[1] + ".json")
        cli.response.writeHead(200, { "Content-Type" : "application/json"});
        const st = fs.createReadStream(cli._c.server.html + "/content/" + cli.path[1] + ".json", {encoding : "utf8"});
        st.on('end', () => { st.destroy(); });
        st.pipe(cli.response);       
    },

    "GET/author" : cli => {
        const sesh = sessions[cli.request.headers.lmltk];
        const author = cli.request.headers.author;

        if (sesh && author) {
            cli._c.db.collection('content').aggregate([
                { $match : { status : "published", author : mongoID(author) } },
                { $sort : { _id : -1 } },
                { $limit : 30 },
                { $lookup : { from : "uploads", as : "media", localField : "media", foreignField : "_id" }},
                { $project : Projections.searchResults },
                { $unwind : "$facebookmedia" }
            ]).toArray((err, arr) => {
                cli.sendJSON({ posts : arr, author });
            });
        } else {
            cli.throwHTTP(404);
        }           
    }
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
