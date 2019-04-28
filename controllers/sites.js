const Controller = require('../base/controller');
const config = require('../lib/config');
const db = require('../lib/db');
const filelogic = require('../pipeline/filelogic');
const slib = require('../lib/sites');

class SiteController extends Controller {
    livevar(cli, levels, params, cb) {
        var len = levels.length;
        if (len > 0 && levels[0] == 'all') {
            db.findToArray(config.default(), 'entities', {_id : cli.userinfo.userid}, function(err, arr) {
                var sites = arr[0].sites;
                var ignore = arr[0].roles.indexOf('admin') !== -1 || arr[0].roles.indexOf('lilium') !== -1;

                if (len < 2 || levels[1] == "simple") {
                    if (levels[2] == "assoc") {
                        var assoc = config.getSimpleSitesAssoc();

                        if (ignore) {
                            cb(assoc);
                        } else {
                            var newarr = {};
                            for (var sid in assoc) {
                                if (sites.indexOf(sid) != -1) {
                                    newarr[sid] = assoc[sid];
                                }
                            }

                            cb(newarr);
                        }
                    } else {
                        var sitearr = config.getSimpleSites();

                        if (ignore) {
                            cb(sitearr);
                        } else {
                            var newarr = [];
                            for (var i = 0; i < sitearr.length; i++) {
                                if (sites.indexOf(sitearr[i].id) != -1) {
                                    newarr.push(sitearr[i]);
                                }
                            }

                            cb(newarr);
                        }
                    }
                } else if (levels[1] == "complex") {
                    var allsites = config.getAllSites();

                    if (ignore) {
                        cb(allsites); 
                    } else {
                        var newarr = [];
                        for (var i = 0; i < allsites.length; i++) {
                            if (sites.indexOf(allsites[i].id) != -1) {
                                newarr.push(allsites[i]);
                            }
                        }

                        cb(newarr);
                    }
                } else {
                    cb([]);
                }
            });
        } else if (len > 0) {
            cb("[SitesException] Cannot find sites under : " + levels[0]);
        } else {
            cb("[SitesException] Cannot use top level of Live Variable : Sites");
        }
    }

    adminGET(cli) {
        if (cli.hasRightOrRefuse("list-websites")) {
            var param = cli.routeinfo.path[2];

            if (!param) {
                filelogic.serveAdminLML(cli);
            } else {
                switch (param) {
                case "launch":
                case "wptransfer":
                    filelogic.serveAdminLML(cli);
                    break;
                default:
                    cli.debug();
                }
            }
        }
    }

    adminPOST(cli) {
        if (!cli.hasRightOrRefuse("launch-websites")) { return; }

        var dat = cli.postdata.data;
        var param = cli.routeinfo.path[2];
        
        switch (param) {
            case "launch":
                db.testConnectionFromParams(dat.dbhost, dat.dbport, dat.dbuser, dat.dbpass, dat.dbname, function (success, err) {
                    if (success) {
                        slib.createSite(cli, dat, function () {
                            log('Sites', 'Redirecting network admin to site list');
                            cli.did('sites', 'created', dat.websitename);
                            cli.redirect(cli._c.server.url + "admin/sites/", false);
                        });
                    } else {
                        cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?error=db&message=" + err, false);
                    }
                });
            break;

            case "wptransfer":
                slib.wptransfer(cli);
                break;

            default:
                cli.throwHTTP(404, 'Not Found');
        }
    }
}

module.exports = new SiteController();
