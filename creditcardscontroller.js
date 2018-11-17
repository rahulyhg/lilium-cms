const CC = require('./creditcards');

class CreditCardController {
    constructor() {
        this.ccManager = require('./creditcards');
    }

    adminPOST(cli) {
        console.log(cli.postdata);
        console.log(cli.routeinfo);
        
        
        const data = cli.postdata.data;
        if (data.number && data.expiryMonth && data.expiryYear && data.cvc && data.currency) {
            this.ccManager.createCreditCard(data.number, data.expiryMonth, data.expiryYear, data.cvc, err => {
                cli.sendJSON({ ok: !err, err });
            });
        } else {
            cli.throwHTTP(400, "You must provide an object with properties number, expiryMonth, expiryYear, cvc and currency", true);
        }
    }
    
    livevar(cli, levels, params, sendback) {
        if (levels[0] == 'identifycc') {
            const digits = params.digits;
            if (digits && digits.length == 6 && !isNaN(digits)) {
                const issuerInfo = CC.getCCIssuerInfo(digits);
                if (issuerInfo) {
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

module.exports = new CreditCardController();
