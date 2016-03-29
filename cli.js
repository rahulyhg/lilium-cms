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
    this.cacheClear = function (err) {
        var createSymlink = this.createSymlink;
        // execFile: executes a file with the specified arguments
        child_process.execFile('rm', ['-r', './html/admin/']);
        child_process.execFile('rm', ['-r', './html/login/']);
        child_process.execFile('rm', ['./html/*.html'], function (error, stdout, stderr) {
            if (err) {
                log('CLI', err);
            } else {
                fs.createDirIfNotExists(_c.default().server.html, function (valid) {
                    if (valid) {
                        log('FileServer',
                            'HTML Directory was validated at : ' +
                            _c.default().server.html
                        );
                    } else {
                        log('FileServer', 'Error validated html directory');
                    }

                }, true);
                log('CLI', 'Cache Cleared.');
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