var fs = require('fs');
var conf = require('./config');
var util = require('util');
var db = require('./db.js');
var hooks = require('./hooks');

var readdirp = require('readdirp');

class CacheInvalidator {
    init(cb) {
        hooks.bind("slug_edited", 1, pkg => {
            const oldpath = pkg._c.server.html + pkg.oldurl;
            log('Cache', 'Clearing cached file ' + oldpath + ".html", 'info');
            fs.unlink(oldpath + ".html", () => {});
        });

        hooks.bind(['article_published', 'article_updated', 'article_deleted', 'article_unpublished'], 1, data => {
            // Update profile page
            log('Cache', 'Homepage needs to be refreshed', 'info');
            hooks.fireSite(data._c, 'homepage_needs_refresh', data);
        });
    };
};

module.exports = new CacheInvalidator();
