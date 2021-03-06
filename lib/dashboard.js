const config = require('./config');
const filelogic = require('../pipeline/filelogic');
const sharedcache = require('./sharedcache');

class DashboardLib {
    getPetals()         {};
    registerDashPetal() {};
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


}

module.exports = new DashboardLib();
