var fs = require('fs');
const filelogic = require('../pipeline/filelogic');
var conf = require('./config');
var util = require('util');
var db = require('./db.js');
var hooks = require('./hooks');

var readdirp = require('readdirp');

var CacheInvalidator = function () {
    var that = this;

    this.init = function (cb) {
        hooks.bind("slug_edited", 1, pkg => {
            const oldpath = pkg._c.server.html + pkg.oldurl;
            if (pkg.paginated) {
                log('Cache', 'Clearing directory ' + oldpath, 'info');
                filelogic.emptyDirectory(oldpath, { fileFilter : "*.html" }, () => {});
            } else {
                log('Cache', 'Clearing cached file ' + oldpath + ".html", 'info');
                filelogic.deleteFile(oldpath + ".html", () => {});
            }
        });

        hooks.bind(['article_published', 'article_updated', 'article_deleted', 'article_unpublished'], 1, function(data) {
            // Update profile page
            log('Cache', 'Homepage needs to be refreshed', 'info');
            hooks.fireSite(data._c, 'homepage_needs_refresh', data);
        });
    };
};

module.exports = new CacheInvalidator();
