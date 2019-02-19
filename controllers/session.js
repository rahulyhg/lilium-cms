const Session = require('../lib/session');
const db = require('../lib/db');
const _c = require('../lib/config');

class SessionController {
    livevar(cli, levels, params, callback) {
        const _id = db.mongoID(cli.userinfo.userid);
        if (_id) {
            db.findUnique(_c.default(), 'entities', { _id }, (err, dat) => {
                db.findToArray(_c.default(), "roles", {name : {$in : dat.roles}}, function(err, arr) {
                    const rights = [];
                    arr.forEach(role => rights.push( ...role.rights ));

                    callback({
                        rights, 
                        _id: dat._id,
                        mustupdatepassword : dat.mustupdatepassword || false,
                        admin: dat.admin,
                        avatarURL: dat.avatarURL,
                        displayname: dat.displayname,
                        roles: dat.roles,
                        username: dat.username,
                        description : dat.description,
                        site : dat.site,
                        preferences : dat.preferences || preferences.getDefault(cli._c),
                        newNotifications: dat.newNotifications || 0,
                        data : (params.withdata ? dat.data : undefined)
                    });
                });
            });
        } else {
            cli.refuse();
        }
    };

}

module.exports = new SessionController();
