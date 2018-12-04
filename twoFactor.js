const _c = require('./config');
const qrcode = require('qrcode');
const base32Encode = require('base32-encode');
const db = require('./includes/db.js');
const otplib = require('otplib');

otplib.authenticator.options = {
    // THe window option controls the number of tokens before and after the current token
    // that should be considered valid
    window: 1
};

class twoFactor {

    adminPOST(cli) {
        cli.touch("twoFactor.adminPOST");
        if (cli.postdata.data.token2fa) {
            if (this.validate2fa(cli.userinfo.userid, cli.postdata.data.token2fa)) {
                if (cli.routeinfo.path[2] == 'activate') {
                    this.activate2fa(cli);
                } else if (cli.routeinfo.path[2] == 'deactivate') {
                    this.deactivate2fa(cli);
                } else {
                    cli.throwHTTP(404, '', true);
                }
            } else {
                cli.throwHTTP(403, 'Invalid 2FA token was provided', true);
            }
        } else if (cli.routeinfo.path[2] == 'deactivate2faForUser') {
            this.deactivate2faForUser(cli);
        } else if (cli.routeinfo.path[2] == 'enforce2fa') {
            this.enforce2fa(cli);
        } else {
            cli.throwHTTP(400, 'Missing 2FA Token', true);
        }
    }

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

    livevar(cli, levels, params, sendback) {
        const seed = base32Encode(Buffer.from(cli.userinfo.userid + _c.default().signature.privatehash), 'RFC4648').substring(0, 32);
        const uri = otplib.authenticator.keyuri(cli.userinfo.user, 'Lilium CMS ' + _c.default().website.sitetitle, seed);

        qrcode.toDataURL(uri, (err, data) => {
            if (!err && data) {
                log("2FA", "Generated Google Authenticator QR Code for user " + cli.userinfo.user, "lilium");
                sendback({ success: true, qrCode: data });
            } else {
                log("2FA", "Error generating Google Authenticator QR Code for user " + cli.userinfo.user, "warn");
                sendback({ success: false, error : "Error generating QR Code"});
            }
        });
    }
}

module.exports = new twoFactor();
