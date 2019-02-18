const db = require('./lib/db');
const request = require('request');
const sharedcache = require('./lib/sharedcache');
let _key;

const BASE_URL = "https://api.darksky.net/forecast/";
const REQ_PARAM = "?exclude=minutely,hourly&units=auto";

class Darksky {
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

    loadKey() {
        try {
            _key = require('../keys/darksky.json');
        } catch (err) {
            log('Darksky', 'JSON key could not be loaded', 'err');
        }
    }

    setup() {
        this.loadKey();
    }

    livevar(cli, levels, params, sendback) {
        db.findUnique(require('./config').default(), 'entities', { _id : db.mongoID(cli.userinfo.userid) }, (err, user) => {
            if (user && user.geo) {
                this.getUserWeather(cli.userinfo.userid, user.geo.latitude, user.geo.longitude, forecast => {
                    sendback(forecast);
                });
            } else {
                sendback({ error : "No geo", type : 1 });
            }
        });
    }
}

module.exports = new Darksky();
