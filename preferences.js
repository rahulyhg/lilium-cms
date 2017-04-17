var log = require('./log.js');
var Admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');
var livevars = require('./livevars.js');
var db = require('./includes/db.js');
var formBuilder = require('./formBuilder.js');
var config = require('./config.js');

var Preferences = function() {

};

var getDefault = function(conf) {
    return {
        topbuttontext : "Publish", 
        topbuttonlink : "admin/article/new"
    }
};

Preferences.prototype.getDefault = function(conf) {
    return getDefault(conf);
};

Preferences.prototype.adminGET = function(cli) {
    if (cli.routeinfo.path.length == 2) {
        filelogic.serveAdminLML(cli, false);
    } else {
        switch (cli.routeinfo.path[2]) {
            
        }

        cli.debug();
    }
};

Preferences.prototype.adminPOST = function(cli) {
    savePreferences(cli, cli.postdata.data, function() {
        cli.refresh();
    });
};

var serveMyPreferences = function(cli, callback) {
    db.find(config.default(), 'entities', {_id : db.mongoID(cli.userinfo.userid)}, [], function(err, cur) {
        cur.next(function(err, obj) {
            callback(err || obj && obj.preferences ? (obj.preferences.form_name ? obj.preferences : getDefault(cli._c)) : {});
        });
    });
};

var savePreferences = function(cli, prefs, callback) {
    cli.session.data.preferences = prefs;

    cli.did('preferences', 'save', prefs);
    db.update(config.default(), 'entities', { _id : db.mongoID(cli.session.data._id) }, {
        preferences : prefs
    }, callback, false, true);
};

Preferences.prototype.livevar = function(cli, levels, params, callback) {
    if (levels.length == 0) {
        callback(new Error("Cannot access Preferences Live Variable root level."));
    }

    switch (levels[0]) {
        case "mine" : 
            serveMyPreferences(cli, callback);             
            break;
        default :
            callback(new Error("Undefined first-level " + levels[0] + " for Live Variable Preferences"));
            break;
    }
};

Preferences.prototype.form = function() {
    formBuilder.createForm('preferences', {
        fieldWrapper : "lmlform-fieldwrapper"
    })
    .add('title-admininterface', 'title', {
        displayname : "Admin Interface"
    })
    .add('topbuttontext', 'text', {
        displayname : "Top Button Text"
    })
    .add('topbuttonlink', 'text', {
        displayname : "Top Button Link"
    })
    .add('save', 'submit', {
        displayname : "Save Preferences",
        value : "Save Preferences"
    })
};

module.exports = new Preferences();
