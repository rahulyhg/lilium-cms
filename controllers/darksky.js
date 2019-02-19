const db = require('../lib/db');
const darkskylib = require('../lib/darksky');

class Darksky {
    setup() {
        darkskylib.loadKey();
    }

    livevar(cli, levels, params, sendback) {
        db.findUnique(require('./lib/config').default(), 'entities', { _id : db.mongoID(cli.userinfo.userid) }, (err, user) => {
            if (user && user.geo) {
                darkskylib.getUserWeather(cli.userinfo.userid, user.geo.latitude, user.geo.longitude, forecast => {
                    sendback(forecast);
                });
            } else {
                sendback({ error : "No geo", type : 1 });
            }
        });
    }
}

module.exports = new Darksky();
