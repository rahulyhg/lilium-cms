const log = require('./log.js');
const config = require('./config.js');
const Petal = require('./petal.js');
const filelogic = require('./filelogic.js');
const lmllib = require('./lmllib.js');
const sharedcache = require('./sharedcache');

const request = require('request');

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

    getQuote(send) {
        sharedcache.get('quoteoftheday', quote => {
            if (quote && quote.day == new Date().getDate()) {
                send(quote);
            } else {
                request('http://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en', {json:true}, (err, resp, text) => {
                    try {
                        if (typeof text == "string") {
                            text = JSON.parse(text);
                        }

                        quote = text;
                        quote.day = new Date().getDate();
                        sharedcache.set({ quoteoftheday : quote });

                        send(quote);
                    } catch (err) {
                        send({});
                    }
                });
            }
        });
    }

    livevar(cli, levels, params, send) {
        if (levels[0] == "quote") {
            this.getQuote(send);
        } else {
            send({});
        }
    };
};

module.exports = new Dashboard();
