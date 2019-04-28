const Controller = require('../base/controller');
const fs = require('fs');
const request = require('request');
const pathlib = require('path');
const mkdirp = require('mkdirp');
const dateformat = require('dateformat');
const db = require('../lib/db.js');
const embedlib = require('../lib/embed');

class EmbedController extends Controller {
    livevar(cli, levels, params, sendback) {
        const action = levels[0];
        const network = levels[1];

        if (action == "single") {
            db.findUnique(cli._c, 'embeds', { _id : db.mongoID(network) }, (err, embed) => {
                sendback({ embed });
            });
        } else if (action == "fetch") {
            db.findUnique(cli._c, 'embeds', { type : network, originalurl : params.url }, (err, embed) => {
                if (embed) {
                    sendback({ embed });
                } else {
                    embedlib.fetch(cli._c, db.mongoID(cli.userinfo.userid), network, params.url, (err, embed) => {
                        if (embed) {
                            db.insert(cli._c, 'embeds', embed, () => {
                                sendback({ embed });
                            });
                        } else {
                            sendback({ err, embed });
                        }
                    });
                }
            });
        } else if (action == "bunch") {
            const $match = { };

            params.filters = params.filters || {};
            if (params.filters.type)   { $match.type = params.type; }
            if (params.filters.search) { $match.originalurl = new RegExp(params.filters.search, 'i'); }

            const $limit = 50;
            const $skip = $limit * ( params.skip ? parseInt(params.skip) : 0 );

            db.join(cli._c, 'embeds', [
                { $match },
                { $sort : { _id : -1 } },
                { $skip },
                { $limit },
            ], items => {
                sendback({ items });
            });
        } else {
            cli.throwHTTP(404, 'Undefined action ' + action, true);
        }
    }
}

module.exports = new EmbedController();
