const googleMapsClient = require('@google/maps');
const xxh = require('xxhashjs')
const db = require('./includes/db.js');
const _c = require('./config');

const GM_CACHE_COLLECTION = 'googleplacescache'

class GoogleMapsController {
    constructor() {
        this.googleClient = undefined;
    }

    livevar(cli, levels, params, sendback) {
        if (this.googleClient) {
            if (levels[0] == 'autocompletequery') {
                if (params.input && params.sessionToken) {
                    this.googleClient.placesAutoComplete({ input: params.input, sessiontoken: params.sessionToken }, (err, data) => {
                        cli.sendJSON(data.json);
                    });
                } else {
                    cli.throwHTTP(400, "This endpoint requires both parameters 'input' and 'sessionToken'", true);
                }
            } else if (levels[0] == 'getplacedetails') {
                if (params.placeid) {
                    this.googleClient.place({ placeid: params.placeid }, (err, data) => {
                        if (!err) {
                            // Key by google place id
                            data.json._id = data.json.place_id;

                            const ops = { $set: data.json, $setOnInsert: { validuntil: Date.now() + (1000 *60 * 60 * 24* 30) } };
                            db.update(_c.default(), GM_CACHE_COLLECTION, { placeid: data.json.place_id }, ops, (err, r) => {
                                cli.sendJSON(data.json || {});
                            }, true);
                        } else {
                            cli.sendJSON({ err: err.json });
                        }
                    });
                } else {
                    cli.throwHTTP(400, "This endpoint requires parameter 'placeid'", true);
                }
            } else {
                cli.throwHTTP(404, 'Not found', true);
            }
        } else {
            cli.throwHTTP(412, 'Google client was not properly initialized', true);
        }
    }

    adminPOST(cli) {
        if (cli.routeinfo.path[2] == 'initclient') {
            try {
                this.initClient();
                cli.sendJSON({ succes: true });
            } catch (e) {
                cli.sendJSON({ succes: false });
                log('GoogleMaps', "Couldn't load Google Maps service account key", 'warn');
            }
        }
    }

    setup() {
        try {
            this.initClient();
        } catch (e) {
            return log('GoogleMaps', "Couldn't load Google Maps service account key", 'warn');
        }
    }

    initClient() {
        const apiKey = require('../keys/placesapi.json').key;
        if (!apiKey) throw new Error('Google Maps API key was null');
        this.googleClient = googleMapsClient.createClient({
            key: apiKey
        });
    }
}

const that = new GoogleMapsController();
module.exports = that;
