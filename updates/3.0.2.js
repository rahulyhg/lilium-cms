const log = require('../log');
const db = require('../includes/db');
const { JSDOM } = require('jsdom');

module.exports = (_c, done) => {
    let counter = 0;

    const doOne = cur => {
        log('Update', 'Parsing content of ' + _c.website.sitetitle + ' for update 3.0.2 : index #' + (++counter), 'lilium')
        cur.next((err, art) => {
            if (art && !err) {
                const content = art.content;

                for (let i = 0; i < content.length; i++) {
                    const dom = new JSDOM(content[i]);
                    const doc = dom.window.document;

                    let ad = doc.querySelector('ad');

                    while (ad) {
                        const elem = doc.createElement('div');
                        elem.className = "lml-adplaceholder";
                        elem.setAttribute('contenteditable', false);

                        ad.parentElement.insertBefore(elem, ad);
                        ad.remove();

                        ad = doc.querySelector('ad');
                    }

                    content[i] = doc.body.innerHTML.toString().trim();
                }

                db.update(_c, 'content', { _id : art._id }, { content }, () => {
                    doOne(cur);
                });
            } else {
                done();
            }
        });
    };

    db.rawCollection(_c, 'content', {}, (err, col) => {
        const cur = col.find().project({ content : 1 });
        doOne(cur);
    });
};
