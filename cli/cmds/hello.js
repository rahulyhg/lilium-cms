const MESSAGES = require('../messages');

module.exports = function(session) {
    log('Shell', 'Received hello message', 'info');
    session.throw(MESSAGES.HELLO);
};
