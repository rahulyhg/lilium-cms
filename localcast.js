const db = require('./includes/db.js');
const hooks = {};

class LocalCast {
    isElderChild() {
        return process.env.instancenum == 0 || typeof process.env.parent == "undefined";
    }

    clustered() {
        return process.env.parent == "gardener";
    }

    broadcast(type, payload, sendback) {
        process.send && process.send({
            type : type,
            payload : payload,
            sender : process.pid,
            sendback : sendback || false
        });
    };

    messageReceived(m) {
        var type = m.type;
        var hks = hooks[type];
        hsk && hsk.forEach(ftc => ftc(m));
    };

    hook(h,c) { this.bind(h,c); }
    bind(hookname, callback) {
        if (!hooks[hookname]) {
            hooks[hookname] = [];
        }

        hooks[hookname].push(callback);
    }

    init() {
        process.on('message', this.messageReceived);
        
        if (this.isElderChild()) {
            log('Localcast', 'Elder child speaking', 'lilium');
        }

        this.hook('hello', msg => {
            log('Localcast', 'Process ' + process.pid + ' received hello message from ' + msg.from, 'success');
        });

        this.broadcast('hello', { from : process.pid }, () => {
            log('Localcast', 'Broadcast hello message from process ' + process.pid, 'info');
        });
    };
}

module.exports = new LocalCast();
