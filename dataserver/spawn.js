const path = require('path');
global.liliumroot = path.join(__dirname, '..');
let shouldSpawn = false;

try {
    global.defaultConfig = require(path.join(liliumroot, 'sites', 'default.json'));
    shouldSpawn = true;
} catch (ex) {

}

if (shouldSpawn) {
    require('./dataserver');
} 