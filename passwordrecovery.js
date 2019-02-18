// ⚠️ Sensitive endpoints /accesscheckpoint ⚠️
const path = require('path');
const request = require('request');

const db = require('./includes/db');
const LML3 = require('./lml3/compiler');
const sharedcache = require('./sharedcache');
const SMS = require('./sms');

class PasswordRecovery {
    generateCode() {
        return (Math.random().toString().substring(3, 9) || this.generateCode()) + "C";
    }

    generateMessage(code) {
        return `Hello 😎 \n\nAs requested, here is your Lilium code : ${code}. \n\nIf you did not request this code please disregard this message.\n\nCheers! 🌺`;
    }

    sendSMS(username, code, callback) {
        db.findUnique(require('./config').default(), 'entities', { username }, (err, entity) => {
            if (entity && entity.phone) {
                SMS.sendTo(entity.phone, this.generateMessage(code), callback);
            } else {
                callback(false);
            }
        }, {phone : 1});
    }

    adminGET(cli) {

    }

    commitPassword(username, password, sendback) {
        sharedcache.unset("recover_user_" + username, () => {
            db.update(require('./config').default(), 'entities', { username }, { shhh : require('./entities').hashPassword(password) }, (err, r) => {
                sendback(r.modifiedCount);
            });
        });
    }

    GET(cli) {
        const maybeusername = cli.routeinfo.path[1];
        if (maybeusername) {
            sharedcache.get("recover_user_" + maybeusername, code => {
                const usercode = cli.request.headers["lml-code"];
                const secret = cli.request.headers["lml-secret"];
                if (!code) {
                    const newcode = this.generateCode();
                    this.sendSMS(maybeusername, newcode, (alright) => {
                        alright ? sharedcache.set({
                            ["recover_user_" + maybeusername] : newcode
                        }, () => {
                            log('Recover', 'Successfully sent code ' + newcode + ' to user ' + maybeusername, 'success');
                            cli.sendJSON({ response : 0 });
                        }) : cli.sendJSON({response : 1});
                    });
                } else if (secret && usercode == code) {
                    this.commitPassword(maybeusername, secret, (valid) => {
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
                    cli._c.server.base, "backend/dynamic/liliumrecover.lml3"
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
