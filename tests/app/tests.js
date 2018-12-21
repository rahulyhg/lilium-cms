const Logger = require('./log');

module.exports.run = (lilium, core) => {
    const logger = new Logger(234);
    logger.init();
    logger.makeGlobal("l");

}
