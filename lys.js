var log = require('./log.js');
var cachedLys = new Object();

var Lys = function() {
    
};

Lys.prototype.registerLiveVar = function() {
    require('./livevars.js').registerLiveVariable('lys', function(cli, levels, params, cb) {
        cb(new Array());
    });
};

module.exports = new Lys();
