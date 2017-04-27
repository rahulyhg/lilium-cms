const config = require('../config.js');

module.exports = (conf, done) => {
    conf.MIMES[".xml"] = "text/xml; charset=utf-8";
    config.saveConfigs(conf, done);
}
