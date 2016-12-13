var filelogic = require('../filelogic.js');
var log = require('../log.js');
var memeMaker = require('meme-maker');

var MemeMaker = function() {};
MemeMaker.prototype.name = "mememaker"; 
MemeMaker.prototype.displayname = "Meme Maker"; 
MemeMaker.prototype.rights = ["author"]; 
MemeMaker.prototype.endpoint = "mememaker"; 
MemeMaker.prototype.icon = "fa-magic"; 

MemeMaker.prototype.register = function() {

}

MemeMaker.prototype.get = function(cli) {
    filelogic.serveAdminLML(cli, false);
    return true;
}

MemeMaker.prototype.post = function(cli) {

}

module.exports = new MemeMaker();
