var config = require('./config.js');
var hooks = require('./hooks.js');
var jsdom = require('jsdom');

var ContentDeliveryNetwork = function() {
    var parseText = function(txt, domain, cdndomain, cb, ignoreHTML) {
        var dom = new jsdom.JSDOM(txt);
        dom = dom.window;

        var scripts = dom.document.documentElement.querySelectorAll('script');
        var imgs = dom.document.body.querySelectorAll('img');
        var links = dom.document.head.querySelectorAll('link');

        for (var i = 0; i < scripts.length; i++) if (scripts[i].src && !scripts[i].classList.contains("lilium")) {
            scripts[i].src = scripts[i].src.replace(domain, cdndomain);
        }

        for (var i = 0; i < imgs.length; i++) if (imgs[i].src) {
            imgs[i].src = imgs[i].src.replace(domain, cdndomain);

            var max = 10;
            var ctn = 0;
            while (imgs[i].srcset.indexOf(domain) != -1) {
                imgs[i].srcset = imgs[i].srcset.replace(domain, cdndomain);
                ctn++;

                if (ctn == max) { break; }
            }
        }

        for (var i = 0; i < links.length; i++) if (links[i].href && links[i].rel != "canonical" && links[i].rel != "amphtml") {
            links[i].href = links[i].href.replace(domain, cdndomain);
        }

        if (ignoreHTML) {
            cb(dom.document.body.innerHTML);
        } else {
            cb('<!DOCTYPE html>' + dom.document.documentElement.outerHTML);
        }
    };

    this.parseOne = function(_c, string, skipValidation) {
        if (skipValidation || (_c.content && _c.content.cdn && _c.content.cdn.domain)) {
            return string.replace(_c.server.url, _c.content.cdn.domain);
        } else {
            return string;
        }
    };

    this.parse = function(txt, cli, cb, ignoreHTML) {
        var _c = cli._c || cli;
        if (_c.content && _c.content.cdn && _c.content.cdn.domain) {
            parseText(txt, _c.server.url, _c.content.cdn.domain, cb, ignoreHTML);
        } else {
            cb(txt);
        }
    };

    this.themeLMLCompiled = function(pkg) {

    };
};

module.exports = new ContentDeliveryNetwork();
