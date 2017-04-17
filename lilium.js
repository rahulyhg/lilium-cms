class LiliumCMS {
    init() {
        const log = require('./log.js');
        log('Lilium', 'Starting up...', 'lilium');

        let startupTime = new Date();
        require('./core.js').makeEverythingSuperAwesome(function (core) {
            let _config = require('./config.js');
            log('Lilium', 'Initialization signal received', 'lilium');
            log('Config', 'App is located at ' + _config.default().server.base, 'info');
            log('Config', 'Root PATH is at ' + _config.default().server.html, 'info');
            log('Config', 'Root URL is at ' + _config.default().server.url, 'info');
            log('Config', 'Public signature ' + _config.default().signature.publichash, 'info');
            log();
            log(
                'Lilium', ' *** Running ' + 
                _config.default().vendor.productname + ' v' + _config.default().vendor.version + ' ***', 
                'lilium'
            );
            log();
            log('Benchmark', 'Init time : ' + (new Date() - startupTime) + "ms", 'success');
            log('Developer', 'Documentation : http://liliumcms.com/docs', 'info');
            log('Developer', 'Hit me up at : http://erikdesjardins.com !', 'info');
            log();
            log('Developer', 'With love; enjoy. <3', 'lilium');
            log();
        });

        return this;
    };

    cms() {
        return this.init();
    };
};

if (typeof process.env.parent != "undefined") {
    module.exports = LiliumCMS
} else {
    require('./log.js')('Lilium', "Lilium started from main class. Please use npm start.", "warn");
    require('./index.prod.js');
}
