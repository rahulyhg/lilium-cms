var config = require('./config.js');
var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var livevars = require('./livevars.js');
var fs = require('./fileserver.js');
var notification = require('./notifications.js');
var sites = require('./sites.js');
var sharedcache = require('./sharedcache.js');

var Role = function () {
    this.adminPOST = function (cli) {
        if (!cli.hasRight('edit-roles')) {
            cli.refuse();
            return;
        }

        cli.touch('role.handlePOST');
        switch (cli.routeinfo.path[2]) {
        case 'list':
            this.new(cli);
            break;
        case 'edit':
            this.edit(cli);
            break;
        case 'delete':
            this.delete(cli);
            break;
        default:
            return cli.throwHTTP(404, 'Not Found');
            break;

        }
    };

    this.adminGET = function (cli) {
        cli.touch('role.handleGET');
        if (!cli.hasRight('edit-roles')) {
            cli.refuse();
            return;
        }

        if (cli.routeinfo.path.length == 2) {
            cli.redirect(cli._c.server.url + "admin/role/list", true);
        } else {
            switch (cli.routeinfo.path[2]) {
            case 'new':
                this.new(cli);
                break;
            case 'edit':
                this.edit(cli);
                break;
            case 'list':
                this.list(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;

            }
        }
    };

    this.list = function (cli) {
        filelogic.serveAdminLML(cli, false);
    }

    this.new = function (cli) {
        cli.touch('role.new');

        if (cli.method == 'POST' && cli.postdata) {
            var redirect = '';

            // Check if current user has sufficient role power
            if (cli.userinfo.roles.indexOf("lilium") != -1 || cli.userinfo.power < cli.postdata.data.power) {
                // Create post
                db.insert(conf.default(), 'roles', prepareRoleForDB(cli), function (err, result) {
                    // Generate LML page
                    cli.refresh();
                });
            } else {
                cli.sendJSON({
                    success: false,
                    msg: 'Insufficient Power'
                });
            }


        } else {
            filelogic.serveAdminLML(cli);
        }

    };

    this.edit = function (cli) {
        if (cli.routeinfo.path[3]) {

            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            if (cli.method == 'POST') {

                var form = formBuilder.handleRequest(cli);
                var response = formBuilder.validate(form, true);
                if (cli.userinfo.power < cli.postdata.data.power) {

                    if (response.success) {
                        var data = prepareRoleForDB(cli);
                        db.update(conf.default(), 'roles', {
                            _id: id
                        }, data, function (err, r) {
                            cli.refresh();
                        });

                    } else {
                        cli.sendJSON({
                            form: response
                        });
                    }
                } else {
                    cli.sendJSON({
                        success: false,
                        msg: 'Insufficient Power'
                    });
                }

            } else {
                filelogic.serveAdminLML(cli, true);
            }


        } else {
            cli.throwHTTP(404, 'Article Not Found');
        }
    }

    this.delete = function (cli) {
        if (cli.postdata.data._id) {
            var id = new mongo.ObjectID(cli.postdata.data._id);

            db.remove(conf.default(), 'roles', {
                _id: id
            }, function (err, r) {
                // Remove notification group
                return cli.sendJSON({
                    success: true
                });
            });

        } else {
            return cli.sendJSON({
                success: false
            });
        }
    }

    var prepareRoleForDB = function (cli) {
        var postdata = cli.postdata.data;
        var rights = new Array();

        for (var key in postdata.rights) {
            rights.push(postdata.rights[key].rights);
        }

        return {
            "name": postdata.name,
            "displayname": postdata.displayname,
            "power": parseInt(postdata.power),
            "rights": rights
        };
    }

    this.livevar = function (cli, levels, params, callback) {
        var allContent = levels.length === 0;

        var maxpower = 100000000000;
        db.findToArray(conf.default(), 'roles', {$or : [{'pluginID': false}, {'pluginID': null}]}, function (err, roles) {
            var Roles = {};
            for (var i = 0; i < roles.length; i++) {
                Roles[roles[i].name] = roles[i];
            }

            for (var i in cli.session.data.roles) {
                var role = cli.session.data.roles[i];

                if (Roles[role] && Roles[role].power < maxpower) {
                    maxpower = Roles[role].power;
                }
            }

            if (allContent || levels[0] == "all") {
                db.findToArray(conf.default(), 'roles', { power : {$gt : maxpower} }, function (err, arr) {
                    callback(arr);
                });
            } else {
                db.multiLevelFind(conf.default(), 'roles', levels, {
                    _id: db.mongoID(levels[0])
                }, {
                    limit: [1]
                }, callback);
            }
        });
    }

    this.form = function () {
        formBuilder.createForm('role_create', {
                fieldWrapper: {
                    tag: 'div',
                    cssPrefix: 'role-field-'
                },
                cssClass: 'role-form',
                dependencies: [],
                async: true
            })
            .add('name', 'text', {
                displayname: "Name",
            })
            .add('displayname', 'text', {
                displayname: "Display Name",
            })
            .add('power', 'number', {
                displayname: "Level (Smaller is stronger)"
            })
            .add('rights', 'stack', {
                displayname: "User Rights",
                scheme: {
                    columns: [{
                        fieldName: 'rights',
                        dataType: 'text',
                        displayname: "Name"
                    }, ]
                }
            })
            .add('Create', 'submit', {
                displayname: "Create Role"
            });
    }

    this.setup = function() {

    }
};

module.exports = new Role();
