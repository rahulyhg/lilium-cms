const Controller = require('../base/controller');
const themelib = require('../lib/themes');
const fs = require('fs');
const _c = require('../lib/config');
const db = require('../lib/db');
const pathLib = require('path');

class ThemeControllers extends Controller {
    adminPOST(cli) {
        if (cli.hasRightOrRefuse("manage-themes")) {
            if (cli.routeinfo.path.length > 2 && cli.routeinfo.path[2] == "enableTheme") {
                themelib.enableTheme(cli._c, cli.postdata.data.uName, () => {
                    cli.sendJSON({
                        success: true
                    });
                });
            } else if (cli.routeinfo.path[2] == "import") {
                themelib.overwriteSettings(cli._c, cli.postdata.data, err => { 
                    err ? cli.throwHTTP(500, err, true) : cli.sendJSON({ newSettings : cli.postdata.data.data });
                });
            } else if (cli.routeinfo.path[2] == "updateOneField") {
                themelib.updateOneField(cli._c, cli.postdata.data.lang, cli.postdata.data.field, cli.postdata.data.value, () => {
                    cli.sendJSON({
                        success: true
                    });
                });
            } else {
                cli.throwHTTP(403, undefined, true);
            }
        } 
    }

    adminGET(cli) {
        cli.touch("themes.adminGET");
        
        if (cli.hasRightOrRefuse("manage-themes")) {
            if (cli.routeinfo.path.length > 2 && cli.routeinfo.path[2] == "enableTheme") {
                themelib.enableTheme(cli._c, cli.postdata.data.uName, () => {
                    cli.sendJSON({
                        success: true
                    });
                });
            } else {
                filelogic.serveAdminLML(cli);
            }
        }
    }

    GET(cli) {
        if (cli.hasRight('manage-themes')) {
            if (cli.routeinfo.path[1]) {
                db.findUnique(cli._c, 'themes', { active : true }, (err, theme) => {
                    cli.sendJSON({
                        originalsite : cli._c.website.sitetitle,
                        originalurl : cli._c.server.url,
                        gemeratedBy : cli.userinfo.userid,
                        gemeratedByDisplayname : cli.userinfo.displayname,
                        theme : theme.uName,
                        themedisplayname : theme.dName,
                        data : theme.settings
                    });
                });
            } else {
                cli.throwHTTP(404, undefined, true);
            }
        } else {
            cli.throwHTTP(401, undefined, true);
        }
    }

    livevar(cli, levels, params, callback) {
        if (levels[0] == "all") {
            fs.readdir(pathLib.join(liliumroot, 'flowers'), (err, dirs) => {
                if (err || dirs.length == 0) {
                    callback([]);
                } else {
                    let index = -1;
                    const themes = [];

                    const nextJSON = () => {
                        const dir = dirs[++index];
                        if (!dir) {
                            callback(themes);
                        } else {
                            fs.readFile(pathLib.join(liliumroot, 'flowers', dir, "info.json"), (err, json) => {
                                if (json) {
                                    themes.push(JSON.parse(json));  
                                } 

                                nextJSON();
                            });
                        }
                    };

                    nextJSON();
                }
            });
        } else if (levels[0] == "current") {
            db.findUnique(cli._c, 'themes', { active : true }, (err, t) => callback(t));
        } else {
            callback();
        }
    }
}

module.exports = new ThemeControllers();
