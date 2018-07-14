const _c = require('./config');
const qrcode = require('qrcode');
const otplib = require('otplib');
const base32Encode = require('base32-encode');

class twoFactor {

    adminPOST(user, action, callback) {
        
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
