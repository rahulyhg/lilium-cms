const configlib = require('../lib/config');
const db = require('./db');
const localcast = require('../network/localcast');

const AUDIENCES_COLLECTION = 'audiences';

// { 'hashed_params': <Audience Object> }
let CACHED_RESPONSES = {};

class LiliumAudiences {
    refreshAudiences() {
        configlib.eachSync(_c => {
            db.findToArray(_c, AUDIENCES_COLLECTION, {}, (err, audiences) => {
                CACHED_RESPONSES = {};
                this.audiences[_c.id] = audiences;
                this.audiences[_c.id].default = audiences.find(a => a.default) || audiences[0];
            });
        });
    }

    bindLocalCast() {
        localcast.bind("refresh_audiences", this.refreshAudiences.bind(this));
    }

    preload() {
        this.audiences = {};

        this.bindLocalCast();
        this.refreshAudiences();
    }

}

module.exports = new LiliumAudiences();
