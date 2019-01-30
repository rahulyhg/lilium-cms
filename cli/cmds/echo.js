module.exports = function(session, ...args) {
    session.sendData(args.join(' '));
}
