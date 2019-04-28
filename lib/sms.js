const request = require('request');
const hooks = require('../lib/hooks')
const pathlib = require('path');

class SMS {
    getConfig() {
        try {
            return require(pathlib.join(liliumkeys, 'twilio.json'));
        } catch (ex) {
            return { error : ex };
        }
    }

    formatURL(conf) {
        return `https://${conf.sid}:${conf.token}@api.twilio.com/2010-04-01/Accounts/${conf.sid}/Messages.json`;
    }

    sendTo(to, message, done) {
        const conf = this.getConfig();
        if (!conf.error) {
            const url = this.formatURL(conf);
            to = to.trim().replace(/[\-\(\)\s]/g, '');
            log('SMS', 'Sending SMS to ' + to, 'info');

            hooks.fire("sendingSMS", {to, message});
            request.post(url, { form : {
                To : to, From : conf.from, Body : message
            } }, (err, resp, body) => {
                err && log("SMS", "Error sending SMS. From Twilio : " + body, 'err');
                done(!err);
            });
        } else {
            log('SMS', 'Error sending SMS : Error with Twilio config file', 'err');
            console.log(conf.error);
            done(false);
        }
    }
}

module.exports = new SMS();
