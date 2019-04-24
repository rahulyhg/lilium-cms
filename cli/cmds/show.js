const db = require(liliumroot + '/lib/db');
const MESSAGES = require('../messages');
const { listOfPosts, fullPost } = require('../formatters.js');

const sessionToString = session => `
Session ID : ${session.id}
Connected since : ${session.at.toLocaleTimeString()}
Current website : ${session._c.website.sitetitle}`;

const latestSomething = (session, subcontext) => {
    switch (subcontext) {
        case "posts":
        case "articles": {
            db.join(session._c, 'content', [
                { $match : { status : "published" } },
                { $sort : { date : -1 } },
                { $limit : 20 }
            ], posts => {
                session.sendData(listOfPosts(posts));
            });
        } break;

        default: 
            session.throw(MESSAGES.INVALID_ARGS);
    }       
};

const sendPost = (session, query) => {
    db.findUnique(session._c, 'content', {
        $or : [
            { _id : db.mongoID(query) },
            { name : query },
            { url : query },
            { aliases : query },
            { title : new RegExp(query) },
        ]
    }, (err, postdata) => {
        if (postdata) {
            require(liliumroot + '/content').getFull(session._c, postdata._id, post => {
                session.sendData(fullPost(post));
            });
        } else {
            session.throw(MESSAGES.CONTENT_NOT_FOUND);
        }
    }, {_id : 1});
};

module.exports = function(session, context, ...args) {
    if (!context) {
        return session.throw(MESSAGES.INVALID_ARGS);
    }

    switch (context) {
        case "session": {
            session.sendData(sessionToString(session));
        } break;

        case "article":
        case "post": {
            sendPost(session, ...args);
        } break;

        case "latest": {
            latestSomething(session, ...args);
        } break;

        default: {
            session.throw(MESSAGES.INVALID_CONTEXT);
        }
    }
}
