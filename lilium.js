class LiliumCMS {
    init() {
        global.log = require('./log');
        global.liliumroot = __dirname;
        log('Lilium', 'Starting up...', 'lilium');

        let startupTime = Date.now();
        require('./core.js').makeEverythingSuperAwesome(core => {
            let _config = require('./config.js');
            log('Lilium', 'Initialization signal received', 'lilium');
            log('Config', 'App is located at ' + _config.default().server.base, 'info');
            log('Config', 'Root PATH is at ' + _config.default().server.html, 'info');
            log('Config', 'Root URL is at ' + _config.default().server.url, 'info');
            log('Config', 'Public signature ' + _config.default().signature.publichash, 'info');
            log();
            log( 'Lilium', ' *** Running Lilium CMS v4.0.1 ***', 'lilium');
            log();
            log('Benchmark', 'Init time : ' + (Date.now() - startupTime) + "ms", 'success');
            log('Developer', 'Documentation : http://liliumcms.com/docs', 'info');
            log('Developer', 'Hit me up at : http://erikdesjardins.com !', 'info');
            log();
            log('Developer', 'With love; enjoy. <3', 'lilium');
            log();

            if (global.__START_TESTS) {
                global.__START_TESTS(this, core);
            }
        });

        return this;
    };

    cms() {
        return this.init();
    };
};

if (typeof process.env.parent != "undefined" || (global.liliumenv && global.liliumenv.mode == "script")) {
    module.exports = LiliumCMS
} else {
    require('./log.js')('Lilium', "Lilium started from main class. Please use npm start.", "warn");
}
