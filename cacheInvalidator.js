var fs = require('fs');
var conf = require('./config.js');
var EventEmitter = require('events');
var util = require('util');
var db = require('./includes/db.js');
var hooks = require('./hooks.js');
var log = require('./log.js');
/**
 * Contains all the functions to call when a
 * cachedFileInvalidated is fired
 * {fileName : [EventName, value ...],
 * 	fileName2 : [...]}
 * @type {Object}
 */
var cachedFileEvents = {};

/**
 * Contains all the functions to call when a
 * cachedRequestInvalidated is fired
 * {eventName : [fct1, fct2 ...],
 * 	eventName2 : [...]}
 * @type {Object}
 */
var cachedRequestEvents = {};

function CacheInvalidatedEmitter() {
    EventEmitter.call(this);
}
util.inherits(CacheInvalidatedEmitter, EventEmitter);

var CacheInvalidator = function () {
    var that = this;
    var folders = [];
    this.emitter = new CacheInvalidatedEmitter();

    var noOp = require('./noop.js');

    this.addFolderToWatch = function (path) {
        fs.watch(path, function (event, filename) {
            var fileInvalidated = cachedFileEvents[filename];
            if (typeof cachedFileEvents[filename] !== 'undefined') {
                that.emitter.emit(fileInvalidated);
            }

        });
    };

    this.addFileToWatch = function (path, eventName, value, conf) {
        cachedFileEvents[path] = {};
        cachedFileEvents[path] = {
            name: eventName,
            value: value,
            db: conf.id
        };
        db.insert(conf.id, 'cachedFiles', {
            file: path,
            extra: cachedFileEvents[path]
        }, function (err) {
            log('Cache Invalidator', err || "Watching " + path);
        });
    };

    this.removeFileToWatch = function (path) {
        if (typeof cachedFileEvents[path] !== 'undefined') {
            db.remove(conf.default(), 'cachedFiles', {
                file: path
            }, function (err) {
                delete cachedFileEvents.path;
            }, true);
        }
    };

    this.deleteCachedFile = function (conf, rel, cb) {
        log('[CacheInvalidator] Invalidating file ' + conf.server.html + "/" + rel);
        fs.unlink(conf.server.html + "/" + rel, cb || function () {});
    };

    this.registerDeletionOnHook = function (hook, filepath) {
        hooks.bind(hook, 10, function () {
            fs.unlink(filepath);
        });
    };

    this.init = function (cb) {
        this.addFolderToWatch(conf.default().server.html);
        db.findToArray(conf.default(), 'cachedFiles', {}, function (err, arr) {
            arr.forEach(function (elem) {
                cachedFileEvents[elem.file] = elem.extra;
            });
            cb();
        });
    };

    hooks.bind('article_created', 1, function(data) {
        // Update profile page
    });

    hooks.bind('article_deleted', 1, function(data) {
        // Update profile page
    });

    hooks.bind('article_edited', 1, function(data) {
        // Update profile page
    });

    hooks.bind('profile_picture_updated', 1, function(data) {
        that.deleteContentByAuthor(data.cli.userinfo.userid, data.cli._c);
    });

    this.deleteContentByAuthor = function(authorId, conf) {
        // Find articles of the Author
        db.findToArray(conf, 'content', {author: db.mongoID(authorId)}, function(err, arr) {
            if (err) {
                log("[CacheInvalidator] Error while requesting to db :" + err);
            } else {
                for (var i in arr) if (arr[i].name) {
                    that.deleteCachedFile(conf, arr[i].name + '.html');
                }
            }
        });
    }

};

module.exports = new CacheInvalidator();
