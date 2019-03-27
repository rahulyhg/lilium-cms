const _c = require('./config');
const qrcode = require('qrcode');
const otplib = require('otplib');
const base32Encode = require('base32-encode');
const db = require('./includes/db');

class twoFactor {

    adminPOST(cli) {
        const token2fa = cli.postdata.data.token2fa;
        const usr = cli.userinfo.user;
        const secret = base32Encode(Buffer.from(usr + _c.default().signature.privatehash), 'RFC4648').substring(0, 32);

        console.log(cli.postdata, usr, secret);

        if (token2fa && otplib.authenticator.check(token2fa, secret)) {
            db.update( _c.default(), 'entities', { 'revoked': { $ne: true }, 'username': cli.userinfo.user }, { confirmed2fa: true }, (err, r) => {
                if (!err) {
                    log("2FA", '2FA has been activated for user ' + usr, "lilium");
                    cli.sendJSON({ success: true });
                } else {
                    cli.throwHTTP(500, JSON.stringify(err), true);
                }
            });
        } else {
            cli.throwHTTP(403, "Token didn't match", true);
        }
    }

    livevar(cli, levels, params, sendback) {
        const seed = base32Encode(Buffer.from(cli.userinfo.user + _c.default().signature.privatehash), 'RFC4648').substring(0, 32);
        const uri = otplib.authenticator.keyuri(cli.userinfo.user, 'Lilium CMS ' + _c.default().website.sitetitle, seed);

        qrcode.toDataURL(uri, (err, data) => {
            if (!err && data) {
                log("Auth", "Generated Google Authenticator QR Coduserinfoe for user " + cli.userinfo.user, "lilium");
                sendback({ qrCode: data });
            } else {
                log("2FA", "Error generating Google Authenticator QR Code for user " + cli.userinfo.user, "warn");
                sendback({ error : "Error generating QR Code"});
            }
        });
    }
}

module.exports = new twoFactor();
