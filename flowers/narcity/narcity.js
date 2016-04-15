var endpoints = undefined;
var livevars = undefined;
var filelogic = undefined;

var Potager = function () {
    var themePath;

    var initRequires = function(abspath) {
        endpoints = require(abspath + 'endpoints.js');
        filelogic = require(abspath + 'filelogic.js');
        livevars = require(abspath + 'livevars.js');
    };

    var loadHooks = function(_c, info) {
        endpoints.register('/', 'GET', function(cli) {
            filelogic.serveAbsoluteLml(themePath + '/homepage.lml', _c.default().server.html + '/index.html', cli)
        });
    };

    var initLivevars = function() {

    };


    this.enable = function (_c, info, callback) {
        themePath = _c.default().server.base + _c.default().paths.theme + '/' + info.identifier;

        initRequires(_c.default().server.base);
        loadHooks(_c.default());
        return callback();
    }

    this.disable = function (callback) {
        return callback();
    }
}

module.exports = new Potager();
