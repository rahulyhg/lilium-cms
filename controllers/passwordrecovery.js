const path = require('path');
const LML3 = require('../lml3/compiler');
const sharedcache = require('../lib/sharedcache');
const plib = require('../lib/passwordrecovery');

class PasswordRecovery {
    GET(cli) {
        const maybeusername = cli.routeinfo.path[1];
        if (maybeusername) {
            sharedcache.get("recover_user_" + maybeusername, code => {
                const usercode = cli.request.headers["lml-code"];
                const secret = cli.request.headers["lml-secret"];
                if (!code) {
                    const newcode = plib.generateCode();
                    plib.sendSMS(maybeusername, newcode, (alright) => {
                        alright ? sharedcache.set({
                            ["recover_user_" + maybeusername] : newcode
                        }, () => {
                            log('Recover', 'Successfully sent code ' + newcode + ' to user ' + maybeusername, 'success');
                            cli.sendJSON({ response : 0 });
                        }) : cli.sendJSON({response : 1});
                    });
                } else if (secret && usercode == code) {
                    plib.commitPassword(maybeusername, secret, (valid) => {
                        cli.sendJSON({response : valid ? 0 : 1})
                    });
                } else if (usercode) {
                    if (usercode == code) {
                        cli.sendJSON({response : 0});
                    } else {
                        log("Recover", 'Wrong recover code for ' + maybeusername + ' : ' + usercode + " is not " + code, 'warn');
                        cli.sendJSON({response : 1});
                    }
                } else {
                    cli.sendJSON({response : 1});
                }
            });
        } else {
            LML3.compile(cli._c, 
                path.join(
                    liliumroot, "backend", "dynamic", "liliumrecover.lml3"
                ), {}, 
            (markup) => {
                cli.sendHTML(markup);
            });
        }
    }

    POST(cli) {

    }
}

module.exports = new PasswordRecovery();
