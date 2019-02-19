const filelogic = require('../pipeline/filelogic');
const db = require('./db.js');
const sharedcache = require('./sharedcache.js');
const mongo = require('mongodb');
const conf = require('./config');

class RoleLib {
    quickEdit(cli) {
        const _id = db.mongoID(cli.routeinfo.path[3]);
        db.update(conf.default(), 'roles', { _id }, cli.postdata.data, () => {
            cli.sendJSON({ ok : 1 })
            db.findUnique(conf.default(), 'roles', { _id }, (err, role) => {
                // role && sharedcache.setRole(role);
            });
        });
    };

    loadRolesInCache(done) {
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


    list(cli) {
        filelogic.serveAdminLML(cli, false);
    }

    new(cli) {
        cli.touch('role.new');

        if (cli.method == 'POST' && cli.postdata) {
            let redirect = '';

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

    edit(cli) {
        if (cli.routeinfo.path[3]) {
            const id = new mongo.ObjectID(cli.routeinfo.path[3]);
            if (cli.method == 'POST') {

                if (cli.hasRight('admin')) {
                    let data = prepareRoleForDB(cli);
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

    delete(cli) {
        if (cli.postdata.data._id) {
            const id = new mongo.ObjectID(cli.postdata.data._id);

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
}

module.exports = new RoleLib();
