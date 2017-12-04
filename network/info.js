const process = require('process');

class NetworkInfo {
    constructor() {
        this.info = {
            isElderChild : process.env.instancenum == 0 || typeof process.env.parent == "undefined"
        };
    }

    isElderChild() {
        return this.info.isElderChild;
    }

    instanceNumber() {
        return process.env.instancenum;
    }

    getGardenerConfig() {
        return require('../sites/default').network;
    }
}

module.exports = new NetworkInfo();
