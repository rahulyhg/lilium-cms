const Controller = require('../base/controller');
const vocablib = require('../lib/vocab');

class VocabController extends Controller {
    adminPOST(cli) {
        if (cli.routeinfo.path[2] == "builddico" && cli.hasRight('admin')) {
            vocablib.preloadDicos(err => {
                cli.sendJSON({ err, success : !err })
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }
}

module.exports = new VocabController();
