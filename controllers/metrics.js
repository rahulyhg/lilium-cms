const Controller = require('../base/controller');
const metricslib = require('../lib/metrics');

class Metrics extends Controller {
    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight('admin')) {
            return cli.refuse();
        }

        if (levels[0] == "get") {
            sendback({ metric : metricslib.get(levels[1]) });
        } else if (levels[0] == "dump") {
            sendback({ metrics : metricslib.report() });
        } else {
            cli.throwHTTP(404, "Undefined top level", true);
        }
    }
}

module.exports = new Metrics();
