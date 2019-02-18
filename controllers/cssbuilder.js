const CSSBuilder = require('../make/cssbuilder');
const pathLib = require('path');

class CSSBuilderController {
    adminPOST(cli) {
        if (cli.hasRightOrRefuse('lilium')) {
            if (cli.routeinfo.path[2] == "lilium") {
                CSSBuilder.build(
                    pathLib.join(liliumroot, 'apps', 'lilium', 'less'), 
                    pathLib.join(liliumroot, 'backend', 'static', 'compiled', 'v4.css'), 
                    { 
                        compress : require('../config').default().env == "prod" 
                    }, 
                err => {
                    err && log('Core', 'Error compiling V4 less files to CSS : ' + err, 'err');
                    cli.sendJSON({ success : !err, err });
                });
            } else {
                cli.throwHTTP(404, undefined, true);
            }   
        }
    }
}

module.exports = new CSSBuilderController();
