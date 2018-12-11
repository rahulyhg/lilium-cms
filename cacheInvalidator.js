var fs = require('fs');
var fileserver = require("./fileserver.js");
var conf = require('./config.js');
var util = require('util');
var db = require('./includes/db.js');
var hooks = require('./hooks.js');
var log = require('./log.js');
var readdirp = require('readdirp');

var CacheInvalidator = function () {
    var that = this;

    this.preloadLatests = function(_c, max, skip, cb) {
        const DEFAULT_MAX_PRELOAD = 50;
        const DEFAULT_SKIP = 0;

        db.find(_c, 'content', {status : "published"}, [], function(err, cur) {
            cur = cur
                .project({_id : 1, date : 1, title : 1})
                .sort({date : -1})
                .limit(max || DEFAULT_MAX_PRELOAD)
                .skip(skip || DEFAULT_SKIP);

            db.all(cur, function(obj, next) {
                log('Cache', 'Preloading article with title ' + obj.title);
                require('./article.js').generateArticle(_c, obj._id, next);
            }, function(total, err) {
                log('Cache', 'Done preloading ' + total + ' articles');
                cb && cb(total, err);
            });
        });
    };

    this.init = function (cb) {
        hooks.bind("slug_edited", 1, pkg => {
            const oldpath = pkg._c.server.html + pkg.oldurl;
            if (pkg.paginated) {
                log('Cache', 'Clearing directory ' + oldpath, 'info');
                fileserver.emptyDirectory(oldpath, { fileFilter : "*.html" }, () => {});
            } else {
                log('Cache', 'Clearing cached file ' + oldpath + ".html", 'info');
                fileserver.deleteFile(oldpath + ".html", () => {});
            }
        });

        hooks.bind(['article_published', 'article_updated', 'article_deleted', 'article_unpublished'], 1, function(data) {
            // Update profile page
            log('Cache', 'Homepage needs to be refreshed', 'info');
            hooks.fireSite(data._c, 'homepage_needs_refresh', data);
            if (data._c && data.article) {
                var html = data._c.server.html;
                var deleteOpt = {
                    fileFilter : "*.html"
                };

                if (data.article.author) {
                    db.findUnique(conf.default(), 'entities', {_id : db.mongoID(data.article.author)}, function(err, entity) {
                        var path = html + "/author/" + entity.slug;
                        log('Cache', 'Emptying author cache : ' + entity.displayname);
                        fileserver.emptyDirectory(path, deleteOpt, function() {});
                    });
                }
            }
        });
    };
};

module.exports = new CacheInvalidator();
