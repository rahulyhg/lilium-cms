const selector = ".lml-instagram-op-3";
const db = require("../lib/db.js");
const embedlib = require('../lib/embed');
const configlib = require('../lib/config');
const { JSDOM } = require('jsdom');
 
let total = 0;
let firstuser;
let postcounter = 0;
const nextLoop = (conf, cur, done) => {
    cur.next((err, post) => {
        if (!post) {
            log('Update', 'Finished parsing old embeds into V4 embeds', 'success');
            return done();
        }

        log('Update', `Working on post ${++postcounter} / ${totalposts}`, 'detail');
        const content = post.content[0] || "";
        const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${content}</body></html>`);
        const embeds = dom.window.document.querySelectorAll(selector);
        total += embeds.length;

        // Possible rate limit hit from Instagram oembed endpoint
        // It is supposed to be documented here : https://www.instagram.com/developer/limits/
        // But the page throws a 404. 
        let asyncCount = -1;
        const nextEmbed = () => {
            if (++asyncCount == embeds.length - 1) {
                log('Update', 'Parsed ' + embeds.length + ' embeds for article ' + post._id, 'success');
                return db.update(conf, 'content', { _id : post._id }, { content : [dom.window.document.body.innerHTML] }, () => {
                    setImmediate(() => nextLoop(conf, cur, done));
                });
            }

            if (embeds[asyncCount].href.includes('/p/')) {
                log('Update', 'Fetching instagram using href ' + embeds[asyncCount].href, 'info');
                embedlib.fetch(conf, firstuser, 'instagram', embeds[asyncCount].href, (err, data) => {
                    if (data) {
                        db.insert(conf, 'embeds', data, err => {
                            const parag = embeds[asyncCount].parentElement;
                            const placeholder = dom.window.document.createElement('div');
                            
                            placeholder.className = "lml-placeholder embed from-v3";
                            placeholder.setAttribute('contenteditable', 'false');
                            placeholder.dataset.id = data._id;
                            placeholder.dataset.type = "embed";
                            placeholder.dataset.embedtype = "instagram";
                            placeholder.dataset.embedjson = JSON.stringify(data);

                            const subwrapper = dom.window.document.createElement('div');
                            subwrapper.className = "embed-preview instagram";
                            placeholder.appendChild(subwrapper);

                            const preview = dom.window.document.createElement('img');
                            preview.setAttribute('src', data.urlpath);
                            preview.className = "lml-embed-carousel-v4-preview";
                            subwrapper.appendChild(preview);

                            parag.parentElement.insertBefore(placeholder, parag);
                            parag.remove();

                            nextEmbed();
                        });
                    } else {
                        nextEmbed();
                    }
                });
            } else {
                nextEmbed();
            }
        }

        nextEmbed();
    });
};

let totalposts;
module.exports = (conf, done) => {
    db.findUnique(configlib.default(), 'entities', {  }, (err, user) => {
        firstuser = user._id;

        db.find(conf, 'content', { "content" : new RegExp(selector) }, [], (err, cur) => {
            cur.count((err, total) => {
                totalposts = total;
                cur.rewind();

                cur.sort({ _id : -1 });

                nextLoop(conf, cur, () => {
                    done();
                });
            });
        });
    });
};
