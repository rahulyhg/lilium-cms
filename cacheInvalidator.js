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
            log('Cache Invalidator', err);
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

    this.deleteCachedFile = function (cli, rel, cb) {
        fs.unlink(cli._c.server.html + "/" + rel, cb || function () {});
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

};

module.exports = new CacheInvalidator();