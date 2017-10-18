const _c = require('./config.js');
const dicos = {};
const fileserver = require('./fileserver.js');
const log = require('./log.js');

class Vocab {
    preloadDicos(done) {
        log("Vocab", "Preloading dictionaries", "info");
        fileserver.listDirContent('./vocab/', function(files) {
            for (let i = 0; i < files.length; i++) {
                if (files[i].indexOf('.json') != -1) {
                    dicos[files[i].substring(0, files[i].length - 3)] = require("./vocab/" + files[i]);
                    log("Vocab", "Loading dico : " + files[i], "detail");
                }
            }

            log("Vocab", "Preloaded dictionaries", "success");
            done();
        });
    }

    getDico(lang) {
        return dicos[lang];
    }
};

module.exports = new Vocab();
