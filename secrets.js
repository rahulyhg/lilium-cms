var config = require('./config.js');
var log = require('./log.js');
var db = require('./includes/db.js');
var admin = require('./backend/admin.js');
var filelogic = require('./filelogic.js');
var livevars = require('./livevars.js');
var CryptoJS = require('crypto-js');
var enc = require('simple-encryptor')(CryptoJS.SHA256(config.default().id+config.default().uid).toString(CryptoJS.enc.Hex));
var entities = require('./entities');

var Secrets = function() {};

/*
    Secret database object structure
    {
        groupname : "Instagram",
        secrets : [
            {
                name : "narcitymontreal",
                displayname : "Narcity Montreal",
                txt : "Encrypted text",
                owner : ObjectId(),
                rights : [ObjectId, ...]
            }, ...
        ]
    }
*/

Secrets.prototype.registerAdminEndpoint = function() {
    admin.registerAdminEndpoint('secrets', 'GET', function(cli) {
        db.findToArray(cli._c, 'secrets', {}, function(err, arr) {
            cli.touch('admin.GET.secrets');
            filelogic.serveAdminLML(cli, false, {
                secrets : arr
            });
        });
    });

    admin.registerAdminEndpoint('secrets', 'POST', function(cli) {
        cli.touch('admin.POST.secrets');
        cli.debug();
    });
};

Secrets.prototype.registerLiveVar = function() {
    livevars.registerLiveVariable('secrets', function(cli, levels, params, cb) {
        if (levels.length === 0) {
            cb("[]");
        } else if (levels[0] == "all") {
            entities.getRights(cli, cli.userinfo.userid, function(rights) {
                var comp = {};
                if (rights[0] !== "*") {
                    comp.right = {$in : rights};
                }

                db.findToArray(cli._c, "secrets", comp, function(err, arr) {
                    cb(arr);
                });
            });
        } else {
            db.findToArray(cli._c, "secrets", {"secrets.name" : levels[0], "secrets.rights" : cli.userinfo.userid}, function(err, arr) {
                if (arr[0]) {
                    
                } else {
                    cb("[NO ACCESS]");
                }
            });
        }
    });
};

module.exports = new Secrets();
