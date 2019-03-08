const db = require('./db');
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
            log('PassRecover', "User requested an SMS", 'info');
            if (entity && entity.phone) {
                log('PassRecover', "User " + username + " will receive an SMS at " + entity.phone, 'info');
                SMS.sendTo(entity.phone, this.generateMessage(code), callback);
            } else {
                entity ? 
                    log('PassRecover', "User does not have a phone number : " + username, 'info') :
                    log('PassRecover', "User does not exist : " + username, 'info');
                   
                callback(false);
            }
        }, {phone : 1});
    }

    commitPassword(username, password, sendback) {
        sharedcache.unset("recover_user_" + username, () => {
            db.update(require('./config').default(), 'entities', { username }, { shhh : require('./entities').hashPassword(password) }, (err, r) => {
                sendback(r.modifiedCount);
            });
        });
    }
}

module.exports = new PasswordRecovery();
