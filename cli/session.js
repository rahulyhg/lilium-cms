const MESSAGES = require('./messages');

class ShellSession {
    constructor(connection) {
        this.connection = connection;
        this.at = new Date();
        this.id = Math.random().toString(16).substring(2);

        this._c = require('../lib/config').default();
    }

    setConfig(_c) {
        this._c = _c;
    }

    throw(err) {
        this.connection.write(JSON.stringify({
            code : err
        }));
    }

    sendOK() {
        this.connection.write(JSON.stringify({ code : MESSAGES.OK }));
    }

    sendData(data) {
        this.connection.write(JSON.stringify({ code : MESSAGES.DATA, data }));
    }
}

module.exports = ShellSession;
