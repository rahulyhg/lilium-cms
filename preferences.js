var log = require('./log.js');
var db = require('./includes/db.js');
const _c = require('./config');

class Preferences {

    adminPOST(cli) {
        cli.touch('Preferences.adminPOST');
        if (cli.routeinfo.path[2] == 'updatePreference') {
            if (cli.postdata.data.preferenceName && typeof cli.postdata.data.value != 'undefined') {
                console.log('passed!');
                db.update(_c.default(), 'entities', {_id: db.mongoID(cli.userinfo.userid)},
                    {[`preferences.${cli.postdata.data.preferenceName}`]: cli.postdata.data.value}, (err, result) => {
                    if (!err) {
                        cli.sendJSON({ success: true });
                        log('Preferences', `Changed preference ${cli.postdata.data.preferenceName} to ${cli.postdata.data.value} for user ${cli.userinfo.user}`, 'success');
                    } else {
                        cli.sendJSON({ success: false });
                        log('Preferences', `Error changing preference ${cli.postdata.data.preferenceName} to ${cli.postdata.data.value} for user ${cli.userinfo.user}`, 'err');
                    }
                });
            } else {
                cli.throwHTTP(400, 'Missing post data', true);
            }
        }
    }

    livevar(cli, levels, params, sendback) {
        cli.touch('Preferences.livevar');
        db.findUnique(_c.default(), 'entities', { _id: db.mongoID(cli.userinfo.userid) }, (err, user) => {
            if (!err) {
                log('Preferences', 'fetched user preferences of user ' + cli.userinfo.user, 'success');
                sendback(user.preferences);
            } else {
                log('Preferences', 'Error getting user preferences for user' + cli.userinfo.user, 'err');
            }
        });
        console.log(this.state);
    }

}

module.exports = new Preferences();
