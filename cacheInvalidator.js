var fs = require('fs');
var conf = require('./config.js');
var EventEmitter = require('events');
var util = require('util');

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

function CacheInvalidatedEmitter(){
  EventEmitter.call(this);
}
util.inherits(CacheInvalidatedEmitter, EventEmitter);

var CacheInvalidator = function() {
  var that = this;
  var folders = [];
  this.emitter = new CacheInvalidatedEmitter();

  this.addFolderToWatch = function (path){
    fs.watch(path, function(event, filename){
      var fileInvalidated = cachedFileEvents[filename];
      if (typeof cachedFileEvents[filename] !== 'undefined') {
        that.emitter.emit(fileInvalidated[0],fileInvalidated[1]);
      }

    });
  }

  this.addFileToWatch = function(path, eventName, value) {

    cachedFileEvents[path] = [eventName, value];
  }

  this.addFolderToWatch(conf.default.server.html);

}




module.exports = new CacheInvalidator();
