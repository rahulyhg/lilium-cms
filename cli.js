var log = require('./log.js');
var child_process = require('child_process');
var fs = require('./fileserver.js');
var _c = require('./config.js');
var hooks = require('./hooks.js');

/**
 * The cli functions for lilium
 * @return {[type]} [description]
 */
var Cli = function () {
    this.cacheClear = function (err, cb) {
        var createSymlink = this.createSymlink;
        // execFile: executes a file with the specified arguments
        child_process.exec('rm -rf ' +  _c.default().server.base + 'html/admin/*', function(err) {
            if (err) {
                log('[CLI]', 'Error while invalidating cache : ' + err);
                cb();
            } else {
                child_process.exec('rm -rf ' +  _c.default().server.base + 'html/login/*', function(err){
                    if (err) {
                        log('[CLI]','Error while invalidating cache : ' + err);
                        cb();
                    } else {
                        child_process.exec('rm -rf ' +  _c.default().server.base + 'html/*.html', function(err) {
                            if (err) {
                                log('[CLI]','Error while invalidating cache : ' + err);
                            } else {
                                log('[CLI]', 'Cache invalidated!');
                            }

                            cb();
                        });
                    }
                });
            }
        });
    };

    /**
     * Create a symlink with folder verifications
     */
    this.createSymlink = function (rootDir, to, cb) {

        // Check if FROM dir exists
        fs.dirExists(rootDir, function (exists) {
            if (!exists) throw "[SymlinkException] - The root file doesn't exixts : " + rootDir;

            // Check if TO exists
            fs.dirExists(to, function (exists) {

                // If To doesnt exists, create symlink
                if (!exists) {
                    fs.createSymlink(rootDir, to, function (err) {
                        if (cb) return cb(err);
                    });
                }

            });
        });
    }
}

module.exports = new Cli();
