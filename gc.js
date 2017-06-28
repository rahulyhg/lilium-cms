const _c = require('./config.js');
const fileserver = require('./fileserver.js');

class GC {
    clearTempFiles(callback) {
        log('GC', 'Listing temporary files');
        fileserver.listDirContent(_c.default.server.html + "/static/tmp/", files => {
            let fileCount = files.length;
            let fileIndex = 0;

            log('GC', 'Deleting ' + fileCount + ' files');
            const deleteNextFile = () => {
                if (fileIndex < fileCount) {
                    fileserver.deleteFile(_c.default.server.html + "/static/tmp/" + files[fileIndex], () => {
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
    }
};

module.exports = new GC();
