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
        filelogic.serveAdminLML(cli);
    });

    admin.registerAdminEndpoint('secrets', 'POST', function(cli) {
        if (!cli.hasRightOrRefuse('edit-secrets')) {}

        if (cli.routeinfo.path[2] === "add") {
            switch (cli.routeinfo.path[3]) {
                case "group":
                    if (cli.hasRight(cli.postdata.data.right)) {
                        cli.did('secrets', 'group-create', {groupname : cli.postdata.data.name});
                        db.insert(cli._c, 'secrets', {
                            groupname : cli.postdata.data.name,
                            right : cli.postdata.data.right.toLowerCase(),
                            combos : []
                        }, function() {
                            cli.sendJSON({valid : true});
                        });
                    } else {
                        cli.sendJSON({
                            valid : false,
                            reason : "right"
                        })
                    }
                    break;
                case "combo":
                    var groupid = cli.routeinfo.path[4];
                    var conds = { _id : db.mongoID(groupid) };

                    if (cli.userinfo.roles.indexOf('admin') == -1) {
                        conds.right = {$in : cli.userinfo.roles};
                    }

                    db.update(cli._c, 'secrets', conds, {
                        $addToSet : {
                            combos : {
                                _id : db.mongoID(),
                                displayname : cli.postdata.data.name,
                                user : cli.postdata.data.user,
                                cred : cli.postdata.data.pass
                            }
                        }
                    }, function() {
                        cli.did('secrets', 'combo-create', {comboname : cli.postdata.data.name});
                        cli.sendJSON({valid:true, groupid : groupid});
                    }, false, true, true);
                    break;
                default:
                    cli.sendJSON({valid:false, reason:"endpoint"});
            }
        } else if (cli.routeinfo.path[2] == "update") {
            switch (cli.routeinfo.path[3]) {
                case 'combo':
                    var groupid = cli.routeinfo.path[4];
                    var combos = JSON.parse(cli.postdata.data.combos);
                    for (var i = 0; i < combos.length; i++) {
                        combos[i]._id = db.mongoID(combos[i]._id);
                    }

                    db.update(cli._c, 'secrets', {_id : db.mongoID(groupid)}, { combos : combos }, function() {
                        cli.did('secrets', 'group-update', {groupid : groupid});
                        cli.sendJSON({valid:true, groupid : groupid});
                    });
                    break;

                default:
                    cli.sendJSON({valid:false, reason:"endpoint"});
            }
        } else {
            cli.sendJSON({valid:false, reason:"endpoint"});
        }
    });
};

Secrets.prototype.registerLiveVar = function() {
    livevars.registerLiveVariable('secrets', function(cli, levels, params, cb) {
        if (levels.length === 0) {
            cb("[]");
        } else if (levels[0] == "all") {
            var comp = {};
            if (cli.userinfo.roles.indexOf("admin") == -1) {
                comp.right = {$in : cli.userinfo.roles};
            }

            db.findToArray(cli._c, "secrets", comp, function(err, arr) {
                cb(arr);
            });
        } else {
            cb([]);
        }
    });
};

module.exports = new Secrets();
