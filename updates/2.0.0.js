const db = require('../lib/db');

const mkdirp = require('mkdirp');
const configlib = require('../lib/config');

module.exports = (conf, done) => {
    log('Update', 'Updating uploads to new format...');

    mkdirp(conf.server.base + "backend/static/u", () => {
        db.findUnique(configlib.default(), 'entities', {}, (err, firstuser) => {
            db.rawCollection(conf, 'uploads', (err, col) => {
                col.find({}, (err, cur) => {
                    let keepgoing = () => {
                        cur.hasNext((err, hasnext) => {
                            if (hasnext) {
                                cur.next((err, single) => {
                                    single.fullurl = "uploads/" + single.url;
                                    single.v = 1;
                                    single.uploader = null;
                                    single.url = null;

                                    col.updateOne({_id : single._id}, single, () => {
                                        setTimeout(() => {
                                            keepgoing();
                                        }, 0);
                                    });
                                });
                            } else {
                                done();
                            }
                        });
                    };

                    keepgoing();
                });
            });
        });
    });
};
