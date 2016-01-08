var log = require('./log.js');
var child_process = require('child_process');

/**
 * The cli functions for lilium
 * @return {[type]} [description]
 */
var Cli = function() {
  this.cacheClear = function(err) {
    // execFile: executes a file with the specified arguments
    child_process.execFile('rm', ['-r', './html'], function(error, stdout, stderr) {
      if (err) {
        log('CLI', err);
      } else {
        log('CLI', 'Cache cleared');
      }
    });

  };
}

module.exports = new Cli();
