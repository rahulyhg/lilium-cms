const themelib = require('../lib/themes');
const fs = require('fs');
const _c = require('../lib/config');
const db = require('../lib/db');
const pathLib = require('path');

class ThemeControllers {
    adminPOST(cli) {
        if (cli.hasRightOrRefuse("manage-themes")) {
            if (cli.routeinfo.path.length > 2 && cli.routeinfo.path[2] == "enableTheme") {
                themelib.enableTheme(cli._c, cli.postdata.data.uName, function () {
                    cli.sendJSON({
                        success: true
                    });
                });
            } else if (cli.routeinfo.path[2] == "updateOneField") {
                themelib.updateOneField(cli._c, cli.postdata.data.field, cli.postdata.data.value, () => {

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
                themelib.enableTheme(cli._c, cli.postdata.data.uName, function () {
                    cli.sendJSON({
                        success: true
                    });
                });
            } else {
                filelogic.serveAdminLML(cli);
            }
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
