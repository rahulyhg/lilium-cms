const configLib = require('./config');

class Staffing {
    adminPOST(cli) {

    }

    livevar(cli, levels, params, sendback) {
        if (!levels[0]) {
            db.findUnique(_c.default(), 'staffing', { _id: db.mongoID(cli.session.data._id) }, (err, staffinfo = {}) => {
                sendback({err, staffinfo});
            });
        } else if (cli.hasRight('manage-staff')) {
            db.findUnique(_c.default(), 'staffing', { _id: db.mongoID(levels[1]) }, (err, staffinfo = {}) => {
                sendback({err, staffinfo});
            });
        } else {
            cli.throwHTTP(401, undefined, true);
        }
    }
}

module.exports = new Staffing();
