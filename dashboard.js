
const config = require('./config.js');
const filelogic = require('./filelogic.js');
const lmllib = require('./lmllib.js');
const sharedcache = require('./sharedcache');

const request = require('request');

class Dashboard {
    getPetals()         {};
    registerDashPetal() {};
    adminGET(cli)       {};
    registerLMLLib()    {};

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
