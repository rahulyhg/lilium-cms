var _c = require('./config.js');

var _petals = new Object();

var Petals = function () {
    this.isRegistered = function (id) {
        return typeof _petals[id] !== 'undefined';
    };

    this.register = function (id, abspath) {
        if (!this.isRegistered(id)) {
            _petals[id] = {
                filepath: abspath,
                filename: abspath.substring(abspath.lastIndexOf('/')),
                id: id
            };
        } else {
            return new Error("Tried to register already registered petal with id " + id);
        }
    };

    this.get = function (id) {
        if (this.isRegistered(id)) {
            return _petals[id];
        } else {
            return new Error("Tried to fetch unregistered petal with id " + id);
        }
    };

    this.compile = function (id, cb, extra) {
        if (this.isRegistered(id)) {
            //compile template
            filelogic.compile(_petals[id].filepath, cb , extra);

            return ;
        } else {
            return new Error("Tried to compile unregistered petal with id " + id);
        }
    }
};

module.exports = new Petals();
