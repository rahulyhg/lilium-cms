const dashboardlib = require('../lib/dashboard');
const request = require('request');

class Dashboard {
    livevar(cli, levels, params, send) {
        if (levels[0] == "quote") {
            dashboardlib.getQuote(send);
        } else {
            send({});
        }
    };
};

module.exports = new Dashboard();
