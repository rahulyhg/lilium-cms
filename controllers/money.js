const Money = require('../lib/money');

class MoneyController {
    livevar(cli, levels, params, sendback) {
        if (levels[0] == "currencies") {
            sendback({ currencies : Money.currencies });
        } else {
            sendback([]);
        }
    }
}

module.exports = new MoneyController();
