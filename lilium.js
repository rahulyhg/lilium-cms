/*********************************************************************************************************
 *                                                                                                       *
 *  88          88 88 88                                     ,ad8888ba,  88b           d88  ad88888ba    *
 *  88          "" 88 ""                                    d8"'    `"8b 888b         d888 d8"     "8b   *
 *  88             88                                      d8'           88`8b       d8'88 Y8,           *
 *  88          88 88 88 88       88 88,dPYba,,adPYba,     88            88 `8b     d8' 88 `Y8aaaaa,     *
 *  88          88 88 88 88       88 88P'   "88"    "8a    88            88  `8b   d8'  88   `"""""8b,   *
 *  88          88 88 88 88       88 88      88      88    Y8,           88   `8b d8'   88         `8b   *
 *  88          88 88 88 "8a,   ,a88 88      88      88     Y8a.    .a8P 88    `888'    88 Y8a     a8P   *
 *  88888888888 88 88 88  `"YbbdP'Y8 88      88      88      `"Y8888Y"'  88     `8'     88  "Y88888P"    *
 *                                                                                                       *
 *********************************************************************************************************
 * LILIUM CMS | Entry Point                                                                              *
 *                                                                                                       *
 * Lilium is a lightning-fast, online Content Management System built with node.js, without express.     *
 * Its power resides in the cache engine running behind Lilium, which reduces CPU usage, RAM and         *
 * database access.                                                                                      *
 *                                                                                                       *
 * Interpreting its own simple language, Lilium used LML (Lilium Markup Language) to create the          *
 * templates and generate the served files. PML is user friendly, ressemble HTML and makes it easy for   *
 * new developers or web designers to customize their very own themes                                    *
 *                                                                                                       *
 *----- Dependencies ----------------------------------------------------------------------------------- *
 *                                                                                                       *
 * Lilium needs bower installed, a Mongo database, and Node JS. That's it!                               *
 * The user running node must have write access to the root directory of Lilium.                         *
 * We recommend the node package "forever" for running Lilium.                                           *
 *                                                                                                       *
 *----- The people behind Lilium ----------------------------------------------------------------------- *
 *                                                                                                       *
 *    Author : Erik Desjardins                                                                           *
 *    Contributors : Samuel Rondeau-Millaire                                                             *
 *    Documentation : http://liliumcms.com/docs                                                          *
 *                                                                                                       *
 *********************************************************************************************************/
var startupTime = new Date();

// Required module for startup
var _config = require('./config.js');
var log = require('./log.js');
var core = require('./core.js');

var Lilium = function () {
    var init = function () {
        log('Lilium', 'Starting up...');
        core.makeEverythingSuperAwesome(function () {
            log('Lilium', 'Initialization signal received');
            log('Config', 'App is located at ' + _config.default().server.base);
            log('Config', 'Root PATH is at ' + _config.default().server.html);
            log('Config', 'Root URL is at ' + _config.default().server.url);
            log('Config', 'Public signature ' + _config.default().signature.publichash);
            log();
            log('Lilium', ' *** Running ' + _config.default().vendor.productname + ' v' + _config.default().vendor.version + ' ***');
            log();
            log('Benchmark', 'Init time : ' + (new Date() - startupTime) + "ms");
            log('Developer', 'Documentation : http://liliumcms.com/docs');
            log('Developer', 'Hit me up at : http://erikdesjardins.com !');
            log();
            log('Developer', 'With love; enjoy. <3');
        });
    };

    this.cms = function () {
        init();
        return this;
    };
};

module.exports = (new Lilium()).cms();

// With love; enjoy. <3