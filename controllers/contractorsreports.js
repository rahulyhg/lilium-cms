const Controller = require('../base/controller');
const ContractorReport = require('../lib/contractorsreports');
const db = require('../lib/db');

const REPORT_PRESET_COLLECTION = "ctorreppresets";

class ContractorReportController extends Controller {
    livevar(cli, levels, params, sendback) {
        if (cli.hasRight('generate-reports') && cli.hasRight('manage-contractors')) {
            if (levels[0] == "generate") {
                const reporttype = levels[1];
                const report = new ContractorReport(cli._c, params.filters, reporttype);

                return report.generate(report => sendback({ report }));
            } else if (levels[0] == "presets") {
                return db.findToArray(configlib.default(), REPORT_PRESET_COLLECTION, {  }, (err, presets) => {
                    sendback({ presets })
                });
            } else {
                return cli.throwHTTP(404, 'No such level', true);
            }
        }


    }
}

module.exports = new ContractorReportController();
