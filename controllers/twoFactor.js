const twofalib = require('../lib/twoFactor');
const qrcode = require('qrcode');
const base32Encode = require('base32-encode');
const optlib = require('otplib');

class twoFactor {
    adminPOST(cli) {
        cli.touch("twoFactor.adminPOST");
        if (cli.postdata.data.token2fa) {
            if (twofalib.validate2fa(cli.userinfo.userid, cli.postdata.data.token2fa)) {
                if (cli.routeinfo.path[2] == 'activate') {
                    twofalib.activate2fa(cli);
                } else if (cli.routeinfo.path[2] == 'deactivate') {
                    twofalib.deactivate2fa(cli);
                } else {
                    cli.throwHTTP(404, '', true);
                }
            } else {
                cli.throwHTTP(403, 'Invalid 2FA token was provided', true);
            }
        } else if (cli.routeinfo.path[2] == 'deactivate2faForUser') {
            twofalib.deactivate2faForUser(cli);
        } else if (cli.routeinfo.path[2] == 'enforce2fa') {
            twofalib.enforce2fa(cli);
        } else {
            cli.throwHTTP(400, 'Missing 2FA Token', true);
        }
    }

    livevar(cli, levels, params, sendback) {
        const seed = base32Encode(Buffer.from(cli.userinfo.userid + _c.default().signature.privatehash), 'RFC4648').substring(0, 32);
        const uri = optlib.authenticator.keyuri(cli.userinfo.user, 'Lilium CMS ' + _c.default().website.sitetitle, seed);

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
