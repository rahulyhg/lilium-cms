var db = require('./includes/db.js');
var log = require('./log.js');
var hooks = {};

var LocalCast = function() {
    
};

LocalCast.prototype.isElderChild = function() {
    return process.env.instancenum == 0 || typeof process.env.parent == "undefined";
};

LocalCast.prototype.clustered = process.env.parent == "gardener";

LocalCast.prototype.broadcast = function(type, payload, sendback) {
    if (!this.clustered) return;

    process.send({
        type : type,
        payload : payload,
        sender : process.pid,
        sendback : sendback || false
    });
};

LocalCast.prototype.messageReceived = function(m) {
    var type = m.type;
    var hks = hooks[type];
    if (hks) {
        for (var i = 0; i < hks.length; i++) {
            hks[i](m);
        }
    }
};

LocalCast.prototype.hook = LocalCast.prototype.bind = function(hookname, callback) {
    if (!hooks[hookname]) {
        hooks[hookname] = [];
    }

    hooks[hookname].push(callback);
}

LocalCast.prototype.init = function() {
    process.on('message', this.messageReceived);
    
    if (this.isElderChild()) {
        log('Localcast', 'Elder child speaking', 'lilium');
    }
};

module.exports = new LocalCast();
