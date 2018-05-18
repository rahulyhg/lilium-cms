const request = require('request');
const log = require('./log');
const hooks = require('./hooks')

class SMS {
    getConfig() {
        try {
            return require('../keys/twilio.json');
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
            log('SMS', 'Sending SMS to ' + to);

            hooks.fire("sendingSMS", {to, message});
            request.post(url, { form : {
                To : to, From : conf.from, Body : message
            } }, (err, resp, body) => {
                err && log("SMS", "Error sending SMS. From Twilio : " + body, 'err');
                done(!err);
            });
        } else {
            log('SMS', 'Error sending SMS : Missing Twilio config file', 'err');
            done(false);
        }
    }
}

module.exports = new SMS();
