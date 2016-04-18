var endpoints = undefined;
var livevars = undefined;
var filelogic = undefined;

var themePath;

// TODO : Receive context site
var NarcityTheme = function () {
    var initLivevars = function() {

    };
}

var initRequires = function(abspath) {
    endpoints = require(abspath + 'endpoints.js');
    filelogic = require(abspath + 'filelogic.js');
    livevars = require(abspath + 'livevars.js');
};

var loadHooks = function(_c, info) {
    endpoints.register(_c.id, '', 'GET', function(cli) {
        console.log(themePath + '/homepage.lml');
        filelogic.serveAbsoluteLml(themePath + '/homepage.lml', _c.server.html + '/index.html', cli)
    });
};

NarcityTheme.prototype.enable = function (_c, info, callback) {
    themePath = _c.server.base + _c.paths.themes + '/' + info.uName;

    initRequires(_c.server.base);
    loadHooks(_c);
    return callback();
}

NarcityTheme.prototype.disable = function (callback) {
    return callback();
}

module.exports = new NarcityTheme();
