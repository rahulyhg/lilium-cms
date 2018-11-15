const config = require('./config.js');
const db = require('./includes/db');

class CreditCardManager {
    adminPOST(cli) {

    }
    
    livevar(cli, levels, params, sendback) {
        db.findToArray(config, 'creditcards', {}, (err, data) => {
            if (!err && data) {
                return sendback(data);
            } else {
                log('CreditCards', 'Error while fetching credit cards from the database: ' + e.message, 'error');
                cli.throwHTTP(500, 'Error fetching the credit cards', true);
            }
        });
    }
}

module.exports = new CreditCardManager();
