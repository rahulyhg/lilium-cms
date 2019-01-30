const log = require('./log.js');
const config = require('./config.js');
const networkinfo = require('./network/info.js');
const db = require('./includes/db.js');
const scheduler = require('./scheduler.js');
const request = require('request');
const sharedcache = require('./sharedcache.js');

const igDomain = "https://www.instagram.com/";
const statsParam = "?__a=1";
const isElder = networkinfo.isElderChild();

class LMLInstagram {
    constructor() {
        this.intervalJob;
    }

    getAccounts(conf) {
        return conf.social && conf.social.instagram && conf.social.instagram.accounts && conf.social.instagram.accounts.split(',');
    }

    getAccountsData(conf, send) {
        let accounts = this.getAccounts(conf);
    }
    
    livevar(cli, levels, params, send) {
        let toplevel = levels[0];

        switch (toplevel) {
            case "stats":
                db.findToArray(cli._c, 'instagramstats', levels[1] ? {username : levels[1]} : {}, (err, arr) => {
                    send(levels[1] ? arr[0] : arr);
                });
            break;

            case "accounts":
                db.findToArray(cli._c, 'instagram', levels[1] ? {username : levels[1]} : {}, (err, arr) => {
                    send(levels[1] ? arr[0] : arr);
                });
            break;

            default:
                send(false);
        }
    }

    GET(cli) {
        const url = cli.routeinfo.params.u;
        if (url && url.includes('instagram')) {
            request(url).pipe(cli.response);
        } else {
            cli.throwHTTP(404, undefined, true)
        }
    }

    storeStats(conf, done) {
        this.getStats(conf, (stats) => {
            let accounts = Object.keys(stats);

            let aindex = -1;
            let nextAccount = () => {
                if (++aindex == accounts.length) {
                    return done && done();
                }

                let stat = stats[accounts[aindex]];

                if (!stat || !stat.user || !stat.user.username) {
                    return nextAccount();
                }

                log("Instagram", "Storing stats for account : " + stat.user.username);
                db.update(conf, 'instagram', {username : stat.user.username}, {
                    username : stat.user.username,
                    type : "account",
                    updated : new Date(),
                    user : stat.user
                }, () => {
                    db.insert(conf, 'instagramstats', {
                        username : stat.user.username,
                        type : "stats",
                        time : new Date(),
                        followers : stat.user.followed_by.count,
                        following : stat.user.follows.count,
                        uploads : stat.user.media.count
                    }, nextAccount);
                }, true);
            };

            nextAccount();
        });
    }

    getSingleAccountStats(username, send) {
        let url = igDomain + username + statsParam;
        if (username.includes('instagram.com')) {
            url = username + statsParam;
        }

        sharedcache.get('instagram_stats_' + url, (json) => {
            if (!json || json.expire < new Date().getTime()) {
                request({
                    headers : {"User-Agent" : config.lmlUserAgent},
                    url
                }, (err, resp, json) => {
                    if (err) {
                        return send(err);
                    }

                    try {
                        json = JSON.parse(json);
                        json.expire = new Date().getTime() + (1000 * 60 * 5);

                        sharedcache.set({
                            ["instagram_stats_" + url] : json
                        }, () => {
                            send(json);
                        });
                    } catch (ex) {
                        send({error : ex})
                    }
                });
            } else {
                send(json);
            }
        });
    }

    getStats(conf, send) {
        let accounts = this.getAccounts(conf) || [];
        let aindex = 0;
        let stats = {};

        let nextAccount = () => {
            if (aindex == accounts.length) {
                return send(stats);
            }

            let username = accounts[aindex].trim();
            this.getSingleAccountStats(username, (resp) => {
                stats[username] = resp;
                aindex++;
                nextAccount.apply(this);
            });
        };

        nextAccount.apply(this);
    }
}

module.exports = new LMLInstagram();
