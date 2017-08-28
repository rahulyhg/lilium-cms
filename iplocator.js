const log = require('./log');
const db = require('./includes/db');
const request = require('request');
const config = require('./config');

const requestQueue = [];

const API_URL = "https://tools.keycdn.com/geo.json?host=";

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

                request({
                    url : API_URL + nxt.ip,
                    method : "GET",
                    json : true
                }, (err, msg, json) => {
                    if (json && json.status == "success") {
                        const geo = json.data.geo;
                        geo.updatedAt = new Date();
                        db.update(config.default(), 'entities', { _id : db.mongoID(nxt.userid) }, { geo }, () => {

                        });
                    }

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
                ip : cli.request.headers["x-real-ip"]
            })

            setTimeout(() => {
                this.handleQueue();
            }, 0);
        }
    }
}

module.exports = new IPLocator();
