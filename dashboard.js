const log = require('./log.js');
const config = require('./config.js');
const Petal = require('./petal.js');
const filelogic = require('./filelogic.js');
const lmllib = require('./lmllib.js');

const _dashpetals = [];

class Dashboard {
    getPetals() {
        const pets = [];

        for (var pos in _dashpetals) {
            pets.push(Petal.get(_dashpetals[pos]).id);
        }

        return pets;
    };

    registerDashPetal(petalID, prio) {
        while (typeof _dashpetals[prio] !== 'undefined') prio++;
        _dashpetals[prio] = petalID;
    };

    adminGET(cli) {
        if (cli.hasRightOrRefuse("dashboard")) {
            filelogic.serveAdminLML(cli);
        }
    };

    registerLMLLib() {
        lmllib.registerContextLibrary('dashboard', function (context) {
            return new Dashboard();
        });
    };
};

module.exports = new Dashboard();
