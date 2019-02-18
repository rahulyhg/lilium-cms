const db = require('./includes/db');
const request = require('request');
const config = require('./config');

const requestQueue = [];

let STRATEGY_ROTATION = 0;
let STRATEGIES = ["Nekudo", "KeyCDN"];

class IPStrategy {
    static useOne(ip, userid, done) {
        STRATEGY_ROTATION++;
        if (STRATEGY_ROTATION == STRATEGIES.length) {
            STRATEGY_ROTATION = 0;
        }

        IPStrategy[STRATEGIES[STRATEGY_ROTATION]](ip, userid, done);
    }

    static Nekudo(ip, userid, done) {
        const API_URL = "http://geoip.nekudo.com/api/";

        request({
            url : API_URL + ip,
            method : "GET",
            json : true
        }, (err, msg, json) => {
            if (json && json.type != "error") {
                const geo = json;
                db.update(config.default(), 'entities', { _id : db.mongoID(userid) }, { 
                    geo : {
                        latitude : geo.location.latitude,
                        longitude : geo.location.longitude,
                        timezone : geo.location.time_zone,
                        city : geo.city,
                        country : geo.country.name,
                        ip : ip,
                        updatedAt : new Date()
                    }
                }, () => {
                    done();
                });

            } else {
                done();
            }
        });
    }

    static KeyCDN(ip, userid, done) {
        const API_URL = "https://tools.keycdn.com/geo.json?host=";
        request({
            url : API_URL + ip,
            method : "GET",
            json : true
        }, (err, msg, json) => {
            if (json && json.status == "success" && json.data.geo && json.data.geo.timezone) {
                const geo = json.data.geo;
                db.update(config.default(), 'entities', { _id : db.mongoID(userid) }, { 
                    geo : {
                        latitude : geo.latitude,
                        longitude : geo.longitude,
                        timezone : geo.timezone,
                        city : geo.city,
                        country : geo.country_name,
                        ip : ip,
                        updatedAt : new Date()
                    }
                }, () => {
                    done();
                });
            } else {
                done();
            }
        });
    }
}

let running = false;
class IPLocator {
    handleQueue() {
        if (!running) {
            running = true;

            const nextIP = () => {
                let nxt = requestQueue.shift();
                if (!nxt) {
                    running = false;
                    return;
                }

                IPStrategy.useOne(nxt.ip, nxt.userid, () => {
                    setTimeout(() => {
                        nextIP();
                    }, 1100);
                });
            };

            nextIP();
        }
    }

    findClient(cli) {
        if (cli.userinfo && cli.userinfo.userid) {
            requestQueue.push({
                userid : cli.userinfo.userid,
                ip : cli.request.headers["x-real-ip"] || cli.request.connection.remoteAddress
            })

            setTimeout(() => {
                this.handleQueue();
            }, 0);
        }
    }
}

module.exports = new IPLocator();
