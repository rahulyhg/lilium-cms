const BASE_URL = "https://api.darksky.net/forecast/";
const REQ_PARAM = "?exclude=minutely,hourly&units=auto";
const request = require('request');

const sharedcache = require('./sharedcache');
let _key;

class DarkskyLib {
    getUserWeather(userid, lat, lng, sendback) {
        const ttl = _key.cachettl;
        const now = Date.now();
        const cachekey = "darksky_" + userid;

        sharedcache.get(cachekey, maybeForecast => {
            maybeForecast && maybeForecast.at + ttl > now ? 
                sendback(maybeForecast) : request(
                    BASE_URL + _key.secretkey + "/" + lat + "," + lng + REQ_PARAM, 
                    {json : true}, 
                (err, r, data) => {
                    data.at = Date.now();
                    sharedcache.set({[cachekey] : data});

                    sendback(data);
                });
        });
    }

    getWeather(lat, lng, sendback) {
        request(BASE_URL + _key.secretkey + "/" + lat + "," + lng + REQ_PARAM, {json:true}, (err, r, data) => {
            sendback(data);
        });
    }

    loadKey() {
        try {
            _key = require('../keys/darksky.json');
        } catch (err) {
            log('Darksky', 'JSON key could not be loaded', 'err');
        }
    }
}

module.exports = new DarkskyLib();
