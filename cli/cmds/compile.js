const MESSAGES = require('../messages');

module.exports = function(session, context, ...args) {
    log('Shell', 'Received compile message', 'info');

    switch (context) {
        case "v4":
        case "lilium": {
            
        } break;

        default: {
            session.throw(MESSAGES.INVALID_CONTEXT);
        }
    }
};
