var config = require('./config.js');
var hooks = require('./hooks.js');
var jsdom = require('jsdom');

var ContentDeliveryNetwork = function() {
    var parseText = function(txt, domain, cdndomain, cb, ignoreHTML) {
        jsdom.env(txt, function(err, dom) {
            var scripts = dom.document.documentElement.querySelectorAll('script');
            var imgs = dom.document.body.querySelectorAll('img');
            var links = dom.document.head.querySelectorAll('link');

            for (var i = 0; i < scripts.length; i++) if (scripts[i].src && !scripts[i].classList.contains("lilium")) {
                scripts[i].src = scripts[i].src.replace(domain, cdndomain);
            }

            for (var i = 0; i < imgs.length; i++) if (imgs[i].src) {
                imgs[i].src = imgs[i].src.replace(domain, cdndomain);
            }

            for (var i = 0; i < links.length; i++) if (links[i].href && links[i].rel != "canonical") {
                links[i].href = links[i].href.replace(domain, cdndomain);
            }

            if (ignoreHTML) {
                cb(dom.document.body.innerHTML);
            } else {
                cb('<!DOCTYPE html>' + dom.document.documentElement.outerHTML);
            }
        });
    };

    this.parse = function(txt, cli, cb, ignoreHTML) {
        var _c = cli._c || cli;
        if (_c.content && _c.content.cdn && _c.content.cdn.domain) {
            parseText(txt, _c.server.url, _c.content.cdn.domain, cb, ignoreHTML);
        } else {
            cb(txt);
        }
    };

    this.bind = function() {
        hooks.bind('themeLML_compiled', 100, function(pkg) {
            
        });
    };
};

module.exports = new ContentDeliveryNetwork();
