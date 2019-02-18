const _c = require('../config');
const base32Encode = require('base32-encode');
const db = require('../lib/db.js');
const otplib = require('otplib');

otplib.authenticator.options = {
    // THe window option controls the number of tokens before and after the current token
    // that should be considered valid
    window: 1
};

class twoFactor {
    validate2fa(userid, token) {
        const secret = base32Encode(Buffer.from(userid + _c.default().signature.privatehash), 'RFC4648').substring(0, 32);
        return otplib.authenticator.check(token, secret);
    }

    activate2fa(cli) {
        db.update(_c.default(), 'entities', { username: cli.userinfo.user }, { confirmed2fa: true, enforce2fa : true }, err => {
            if (!err) {
                log('2FA', 'Activated 2FA for user ' + cli.userinfo.user, 'lilium');
                cli.sendJSON({ success: true });
            }
            else {
                cli.throwHTTP(500, 'Internal error', true);
            }
        });
    }

    deactivate2fa(cli) {
        db.update(_c.default(), 'entities', { username: cli.userinfo.user }, { confirmed2fa: false, enforce2fa : false }, err => {
            if (!err) {
                log('2FA', 'Deactivated 2FA for user ' + cli.userinfo.user, 'warn');
                cli.sendJSON({ success: true });
            }
            else {
                cli.throwHTTP(500, 'Internal error', true);
            }
        });
    }

    deactivate2faForUser(cli) {
        db.update(_c.default(), 'entities', { username: cli.postdata.data.username }, { confirmed2fa: false, enforce2fa : false }, err => {
            if (!err) {
                log('2FA', `Admin ${cli.userinfo.user} deactivated 2FA for user ${cli.userinfo.user}`, 'warn');
                cli.sendJSON({ success: true });
            }
            else {
                cli.throwHTTP(500, 'Internal error', true);
            }
        });
    }

    enforce2fa(cli) {
        if (cli.hasRightOrRefuse('manage-entities')) {
            db.update(_c.default(), 'entities', { username: cli.postdata.data.username }, { enforce2fa : true }, err => {
                if (!err) {
                    log('2FA', `Admin ${cli.userinfo.user} enforced 2FA for user ${cli.postdata.data.username}`, 'success');
                    cli.sendJSON({ success: true });
                }
                else {
                    cli.throwHTTP(500, 'Internal error', true);
                }
            });
        }
    }
}

module.exports = new twoFactor();
