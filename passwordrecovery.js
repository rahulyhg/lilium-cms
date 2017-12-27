// ⚠️ Sensitive endpoints /accesscheckpoint ⚠️
const path = require('path');
const log = require('./log');
const db = require('./includes/db');
const LML3 = require('./lml3/compiler');

class PasswordRecovery {
    adminGET(cli) {

    }

    GET(cli) {
        LML3.compile(cli._c, 
            path.join(
                cli._c.server.base, "backend/dynamic/liliumrecover.lml3"
            ), {}, 
        (markup) => {
            cli.sendHTML(markup);
        });
    }

    POST(cli) {

    }
}

module.exports = new PasswordRecovery();
