var log = require('./log.js');
var cachedLys = new Object();

var Lys = function() {
    
};

Lys.prototype.registerDefaultLys = function() {

};

Lys.prototype.registerLys = function(index, presentationName, icon, ftc) {
    cachedLys[index] = {
        index : index,
        title : presentationName,
        icon : icon, 
        ftc : ftc
    }
};

Lys.prototype.livevar = function(cli, levels, params, cb) {
    var arr = [];
    for (var k in cachedLys) {
        arr.push(cachedLys[k]);
    }

    cb(arr);
};

module.exports = new Lys();
