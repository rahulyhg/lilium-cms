const fs = require('fs');
const pathLib = require('path');

class Settings {
    adminGET (cli) {
        return;
    };

    adminPOST(cli) {
        cli.touch('settings.handlePOST');
        if (cli.hasRight('admin')) {
            if (cli.routeinfo.path[2] == "udpateOneField") {
                const filepath = pathLib.join(liliumroot, 'sites', cli._c.jsonfile);
                fs.readFile(filepath, (err, content) => {
                    const settings = JSON.parse(content);
                    const { field, value } = cli.postdata.data;

                    const levels = field.split('.');
                    let finalField = settings;
                    for (let i = 0; i < levels.length - 1; i++) {
                        finalField = finalField[levels[i]];
                    }

                    finalField[levels[levels.length-1]] = value;
                    fs.writeFile(filepath, JSON.stringify(settings, null, 4), {
                        encoding : 'utf8'
                    }, () => {
                        cli.sendJSON({ updated : finalField });
                    });
                });
            } else {
                cli.throwHTTP(403);
            }
        } else {
            cli.throwHTTP(403, 'Unauthorized');
        }
    };

    form() {

    };

    livevar(cli, levels, params, callback) {
        callback(cli._c);
    }
};

module.exports = new Settings();
