const process = require('process');
const gdconf = require('./gardener.json');

let info = {};
class NetworkInfo {
    constructor() {
        info.isElderChild = process.env.instancenum == 0 || typeof process.env.parent == "undefined";
    }

    isElderChild() {
        return info.isElderChild;
    }

    instanceNumber() {
        return process.env.instancenum;
    }

    getGardenerConfig() {
        return gdconf;
    }
}

module.exports = new NetworkInfo();
