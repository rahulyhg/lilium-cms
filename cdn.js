const config = require('./config.js');
const hooks = require('./hooks.js');
const jsdom = require('jsdom');

const parseText = (txt, domain, cdndomain, cb, ignoreHTML) => {
    let dom = new jsdom.JSDOM(txt);
    dom = dom.window;

    const scripts = dom.document.documentElement.querySelectorAll('script');
    const imgs = dom.document.body.querySelectorAll('img');
    const links = dom.document.head.querySelectorAll('link');
    const cdnbackground = dom.document.body.querySelectorAll('.cdn');

    for (let i = 0; i < scripts.length; i++) if (scripts[i].src && !scripts[i].classList.contains("lilium")) {
        scripts[i].src = scripts[i].src.replace(domain, cdndomain);
        scripts[i].classList.add("cdnized");
    }

    for (let i = 0; i < imgs.length; i++) if (imgs[i].src) {
        imgs[i].src = imgs[i].src.replace(domain, cdndomain);
        imgs[i].classList.add("cdnized");

        const max = 10;
        let ctn = 0;
        while (imgs[i].srcset.indexOf(domain) != -1) {
            imgs[i].srcset = imgs[i].srcset.replace(domain, cdndomain);
            ctn++;

            if (ctn == max) { break; }
        }
    }

    for (let i = 0; i < links.length; i++) if (links[i].href && links[i].rel != "canonical" && links[i].rel != "amphtml") {
        links[i].href = links[i].href.replace(domain, cdndomain);
        links[i].classList.add("cdnized");
    }

    for (let i = 0; i < cdnbackground.length; i++) {
        cdnbackground[i].style.backgroundImage = cdnbackground[i].style.backgroundImage.toString().replace(domain, cdndomain);
        cdnbackground[i].style.background = cdnbackground[i].style.background.toString().replace(domain, cdndomain);
        cdnbackground[i].classList.add("cdnized");
    }

    if (ignoreHTML) {
        cb(dom.document.body.innerHTML);
    } else {
        cb('<!DOCTYPE html>' + dom.document.documentElement.outerHTML);
    }
};



class ContentDeliveryNetwork {
    parseOne(_c, string, skipValidation) {
        if (skipValidation || (_c.content && _c.content.cdn && _c.content.cdn.domain)) {
            return string.replace(_c.server.url, _c.content.cdn.domain);
        } else {
            return string;
        }
    };

    parse(txt, cli, cb, ignoreHTML) {
        const _c = cli._c || cli;
        if (_c.content && _c.content.cdn && _c.content.cdn.domain) {
            parseText(txt, _c.server.url, _c.content.cdn.domain, cb, ignoreHTML);
        } else {
            cb(txt);
        }
    };

    themeLMLCompiled(pkg) {

    };
};

module.exports = new ContentDeliveryNetwork();
