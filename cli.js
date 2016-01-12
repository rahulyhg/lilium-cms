var log = require('./log.js');
var child_process = require('child_process');
var fs = require('./fileserver.js');
var _c = require('./config.js');
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
        var staticHTMLPath = _c.default.server.html + '/static';
        fs.dirExists(staticHTMLPath, function(exists) {
          fs.createDirIfNotExists(_c.default.server.html + '/uploads/', function(valid) {
            if (valid) {
              log('CLI',
                'Upload Directory was validated at : ' +
                _c.default.server.html + "/uploads/"
              );
            } else {
              log('CLI', 'Error validated upload directory');
            }
            //Create symlink
            if (!exists) {
              fs.createSymlink(
                _c.default.server.base + 'backend/static/',
                staticHTMLPath,
                function(err) {
                  // Symlink for bower modules
                  fs.createSymlink(
                    _c.default.server.base + 'bower_components/',
                    _c.default.server.html + '/bower/',
                    function(err) {
                      log('CLI', 'Cache Cleared.');
                    }
                  );
                }
              );



            }
          }, true);

        });

      }
    });

  };
}

module.exports = new Cli();
