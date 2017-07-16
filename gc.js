var _c = require('./config.js');
var fileserver = require('./fileserver.js');

var GC = function () {
    this.clearTempFiles = function (callback) {
        log('GC', 'Listing temporary files');
        fileserver.listDirContent(_c.default.server.html + "/static/tmp/", function (files) {
            var fileCount = files.length;
            var fileIndex = 0;

            log('GC', 'Deleting ' + fileCount + ' files');
            deleteNextFile = function () {
                if (fileIndex < fileCount) {
                    fileserver.deleteFile(_c.default.server.html + "/static/tmp/" + files[fileIndex], function () {
                        fileIndex++;
                        deleteNextFile();
                    });
                } else {
                    log('GC', 'Done deleting files for a total of ' + fileIndex);
                    callback();
                }
            };
            deleteNextFile();
        });
    };
};

module.exports = new GC();
