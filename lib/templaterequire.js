const fslib = require('fs');
const pathlib = require('path')

class RequireTemplate {
    constructor(filepath) {
        try {
            log('StaticRequire', 'Requiring ' + filepath, 'info');
            const path = pathlib.join("/", filepath);
            const js = fslib.readFileSync(path);

            this.code = js;
        } catch (err) {
            log('StaticRequire', '[FATAL] Failed to open file ' + filepath, 'err');
            console.log(err);
            return null;
        }
    }

    generate() {
        return eval("`" + this.code + "`");
    }
}

module.exports = filepath => new RequireTemplate(filepath);