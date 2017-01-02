var _c = require('./config.js');
var dicos = {};
var fileserver = require('./fileserver.js');
var log = require('./log.js');

var Vocab = function() {};

Vocab.prototype.preloadDicos = function(done) {
    log("Vocab", "Preloading dictionaries", "info");
    fileserver.listDirContent('./vocab/', function(files) {
        for (var i = 0; i < files.length; i++) {
            if (files[i].indexOf('.js') != -1) {
                dicos[files[i].substring(0, files[i].length - 3)] = require("./vocab/" + files[i]);
                log("Vocab", "Loading dico : " + files[i], "detail");
            }
        }

        log("Vocab", "Preloaded dictionaries", "success");
        done();
    });
};

Vocab.prototype.getDico = function(lang) {
    return dicos[lang];
};

module.exports = new Vocab();
