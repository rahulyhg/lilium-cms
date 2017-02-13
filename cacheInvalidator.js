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

    this.init = function (cb) {
        hooks.bind(['article_published', 'article_updated', 'article_deleted', 'article_unpublished'], 1, function(data) {
            // Update profile page
            hooks.fire('homepage_needs_refresh', data);
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

                var tags = data.article.tags;
                for (var i = 0; i < tags.length; i++) {
                    var path = html + '/tags/' + tags[i];
                    log('Cache', 'Emptying tags cache : ' + tags[i]);
                    fileserver.emptyDirectory(path, deleteOpt, function() {});
                }

                var cats = data.article.categories;
                for (var i = 0; i < cats.length; i++) {
                    var path = html + '/category/' + cats[i];
                    log('Cache', 'Emptying category cache : ' + cats[i]);
                    fileserver.emptyDirectory(path, deleteOpt, function() {});
                }
            }
        });

        hooks.bind('profile_picture_updated', 1, function(data) {
            that.deleteContentByAuthor(data.cli.userinfo.userid, data.cli._c);
        });
    };
};

module.exports = new CacheInvalidator();
