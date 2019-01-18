const MESSAGES = require('../messages');

const sessionToString = session => `
Session ID : ${session.id}
Connected since : ${session.at.toLocaleTimeString()}
Current website : ${session._c.website.sitetitle}`;

module.exports = function(session, context, ...args) {
    if (!context) {
        return session.throw(MESSAGES.INVALID_ARGS);
    }

    switch (context) {
        case "session": {
            session.sendData(sessionToString(session));
        } break;

        default: {
            session.throw(MESSAGES.INVALID_CONTEXT);
        }
    }
}
