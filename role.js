var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var livevars = require('./livevars.js');
var fs = require('./fileserver.js');
var notification = require('./notifications.js');
var sites = require('./sites.js');

var Role = function () {
    this.handlePOST = function (cli) {
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

    this.handleGET = function (cli) {
        cli.touch('role.handleGET');
        if (cli.routeinfo.path.length == 2) {
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "/list", true);
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
            if (cli.userinfo.power < cli.postdata.data.power) {
                // Create post
                db.insert(cli._c, 'roles', prepareRoleForDB(cli), function (err, result) {
                    // Create a new notification group
                    notification.createGroup(cli.postdata.data.name, cli.postdata.data.name, cli._c.id);
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
                        db.update(cli._c, 'roles', {
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

            db.remove(cli._c, 'roles', {
                _id: id
            }, function (err, r) {
                // Remove notification group
                notification.deleteGroup('');
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



    var registerContentLiveVar = function () {
        livevars.registerLiveVariable('roles', function (cli, levels, params, callback) {
            var allContent = levels.length === 0;
            if (allContent) {
                db.singleLevelFind(cli._c, 'roles', callback);
            } else if (levels[0] == "all") {
                var sentArr = new Array();
                db.findToArray(cli._c, 'roles', {}, function (err, arr) {
                    callback(arr);
                });
            } else {
                db.multiLevelFind(cli._c, 'roles', levels, {
                    _id: db.mongoID(levels[0])
                }, {
                    limit: [1]
                }, callback);
            }
        }, ["roles"]);

    }

    var registerForms = function () {
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
            .add('submit', 'submit', {
                displayname: "Create Role"
            });
    }

    var initNotificationGroups = function() {
        var sitesList = sites.getSites();
        for (var i in sitesList) {
            db.findToArray(sitesList[i].id, 'roles', {}, function(err, roles) {
                for (var j in roles) {
                    notification.createGroup(roles[j].name, roles[j].name, sitesList[i].id);
                }
            });
        }
    }


    var init = function () {
        registerContentLiveVar();
        registerForms();
        initNotificationGroups();
    };

    init();
};

module.exports = new Role();
