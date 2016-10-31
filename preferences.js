var log = require('./log.js');
var Admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');
var livevars = require('./livevars.js');
var db = require('./includes/db.js');
var formBuilder = require('./formBuilder.js');

var Preferences = function() {

};

Preferences.prototype.getDefault = function(conf) {
    return {
        topbuttontext : "Publish", 
        topbuttonlink : conf.server.url + "/admin/article/new"
    }
};

Preferences.prototype.handleGET = function(cli) {
    if (cli.routeinfo.path.length == 2) {
        filelogic.serveAdminLML(cli, false);
    } else {
        switch (cli.routeinfo.path[2]) {
            
        }

        cli.debug();
    }
};

Preferences.prototype.handlePOST = function(cli) {
    savePreferences(cli, cli.postdata.data, function() {
        cli.refresh();
    });
};

var serveMyPreferences = function(cli, callback) {
    callback(cli.session.data.preferences);
};

var savePreferences = function(cli, prefs, callback) {
    cli.session.data.preferences = prefs;

    cli.did('preferences', 'save', prefs);
    db.update(cli._c, 'entities', { _id : db.mongoID(cli.session.data._id) }, {
        preferences : prefs
    }, callback, false, true);
};

Preferences.prototype.registerLiveVar = function() {
    livevars.registerLiveVariable('preferences', function(cli, levels, params, callback) {
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
    });
};

Preferences.prototype.registerForm = function() {
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
