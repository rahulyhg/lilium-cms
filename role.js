var config = require('./lib/config');
const filelogic = fs = require('./pipeline/filelogic');
var conf = require('./lib/config');
var db = require('./lib/db.js');
var mongo = require('mongodb');
var livevars = require('./pipeline/livevars');
var notification = require('./notifications.js');
var sites = require('./sites.js');
var sharedcache = require('./lib/sharedcache.js');

var Role = function () {
    this.adminPOST = function (cli) {
        if (!cli.hasRight('edit-roles')) {
            cli.refuse();
            return;
        }

        cli.touch('role.handlePOST');
        switch (cli.routeinfo.path[2]) {
            case "quickedit":
                this.quickEdit(cli);
                break;
            case 'create':
                this.new(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
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
            case "list":
                filelogic.serveAdminLML3(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
            }
        }
    };

    this.quickEdit = function(cli) {
        const _id = db.mongoID(cli.routeinfo.path[3]);
        db.update(config.default(), 'roles', { _id }, cli.postdata.data, () => {
            cli.sendJSON({ ok : 1 })
            db.findUnique(config.default(), 'roles', { _id }, (err, role) => {
                // role && sharedcache.setRole(role);
            });
        });
    };

    this.list = function (cli) {
        filelogic.serveAdminLML(cli, false);
    }

    this.new = function (cli) {
        cli.touch('role.new');

        if (cli.method == 'POST' && cli.postdata) {
            var redirect = '';

            // Check if current user has sufficient role power
            if (cli.hasRight('admin')) {
                // Create post
                db.insert(conf.default(), 'roles', cli.postdata.data, (err, result) => {
                    if (!err) {
                        cli.sendJSON({ success: true });
                    } else {
                        cli.sendJSON({ success: false, msg: 'Internal error' });
                    }
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

                if (cli.hasRight('admin')) {
                    var data = prepareRoleForDB(cli);
                    db.update(conf.default(), 'roles', {
                        _id: id
                    }, data, function (err, r) {
                        cli.refresh();
                    });
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

    this.livevar = function (cli, levels, params, callback) {
        var allContent = levels.length === 0;

        if (levels[0] == "bunch") {
            db.findToArray(conf.default(), 'roles', { $and : [ 
                { name : { $ne : "admin" }}, 
                { name : { $ne : "lilium" }} 
            ]}, (err, roles) => {
                callback({ items : roles, total : roles.length });
            }); 
        } else {
            db.findToArray(conf.default(), 'roles', {$or : [{'pluginID': false}, {'pluginID': null}]}, function (err, roles) {
                if (allContent || levels[0] == "all") {
                    db.findToArray(conf.default(), 'roles', { }, function (err, arr) {
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
    }

    this.loadRolesInCache = (done) => {
        db.findToArray(conf.default(), 'roles', {}, (err, arr) => {
            if (!err) {
                let i = -1;
                const pushRoleToCache = () => {
                    if (arr[++i]) {
                        sharedcache.setRole(arr[i]);
                        pushRoleToCache();
                    } else {
                        log('Role', 'Loaded roles in cache server', 'info');
                        done && done();
                    }
                };
    
                pushRoleToCache();
            } else {
                log('Role', "Could't get roles from database", 'error');
                done && done();
            }
        });
    }
};

module.exports = new Role();
