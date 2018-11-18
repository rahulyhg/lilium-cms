const CC = require('./creditcards');

class CreditCardController {
    constructor() {
        this.ccManager = require('./creditcards');
    }

    adminDELETE(cli) {
        if (cli.hasRightOrRefuse('manage-cc')) {
            if (cli.routeinfo.path[2]) {
                this.ccManager.deleteCreditCard(cli.routeinfo.path[2], (err, r) => {
                    if (!err) log('CreditCardController', `User ${cli.userinfo.user} deleted a credit card with _id ${cli.routeinfo.path[2]}`, 'warn');
                    cli.sendJSON({ ok: !err, err });
                });
            } else {
                cli.throwHTTP(400, "Must provide an id as url param", true);
            }
        }
    }

    adminPUT(cli) {
        
    }

    adminPOST(cli) {
        if (cli.hasRightOrRefuse('manage-cc')) {
            const data = cli.postdata.data;
            if (data.number && data.expiryMonth && data.expiryYear && data.cvc && data.currency) {
                this.ccManager.createCreditCard(data.number, data.expiryMonth, data.expiryYear, data.cvc, err => {
                    log('CreditCardController', `User ${cli.userinfo.user} added a credit card`, 'info');
                    cli.sendJSON({ ok: !err, err });
                });
            } else {
                cli.throwHTTP(400, "You must provide an object with properties number, expiryMonth, expiryYear, cvc and currency", true);
            }
        }
    }
    
    livevar(cli, levels, params, sendback) {
        if (cli.hasRightOrRefuse('manage-cc')) {
            if (levels[0] == 'identifycc') {
                const digits = params.digits;
                if (digits && digits.length == 6 && !isNaN(digits)) {
                    const issuerInfo = CC.getCCIssuerInfo(digits);
                    if (issuerInfo) {
                        log('CreditCardController', `User ${cli.userinfo.user} accessed credit cards`, 'info');
                        sendback(issuerInfo);
                    } else {
                        cli.throwHTTP(404, 'Could not find a vendor associated with the specified IIN', true);
                    }
                } else {
                    cli.throwHTTP(400, "You must provide a 'digits' field as post data that is a 6 digits IIN string", true);
                }
            } else {
                CC.getCreditCards((err, r) => {
                    sendback(r);
                })
            }
        }
    }
}

module.exports = new CreditCardController();
