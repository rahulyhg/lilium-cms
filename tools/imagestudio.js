var filelogic = require('../filelogic.js');
var log = require('../log.js');

var ImageStudio = function() {
    this.name = "imagestudio";
    this.displayname = "Image Studio";
    this.rights = ["create-articles"];
    this.endpoint = "imagestudio";
    this.icon = "fa-paint-brush";
};

ImageStudio.prototype.livevar = function(cli, levels, params, cb) {

};

ImageStudio.prototype.register = function() {

};

ImageStudio.prototype.get = function(cli) {
    filelogic.serveAdminLML(cli, false);
    return true;
};

ImageStudio.prototype.post = function(cli) {

};

module.exports = new ImageStudio();
