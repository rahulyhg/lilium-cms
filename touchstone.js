const log = require('./log');
global.liliumenv = {
    mode : "script"
};

const clearCache = () => {
    Object.keys(require.cache).forEach(file => !require.resolve(file).endsWith('.node') && delete require.cache[file]);
}

const thirdparties = [
    "jsdom", "request", "googleapis", "busboy", "canvas", "deep-diff", "diff", 
    "mongodb", "mkdirp", "readdirp", "redis-server",
    "slugify", "socket.io", "socket.io-redis", "ws"
];

const libLoadTimes = [];
const lrequire = file => {
    clearCache();

    const now = Date.now();
    const lib = require(file);
    const ttload = Date.now() - now;

    libLoadTimes.push({ file, ttload, lib });

    return lib;
};

log('ThirdParties', 'Loading a list of ' + thirdparties.length + ' libraries', 'info');
thirdparties.forEach(file => {
    lrequire(file);
});

libLoadTimes.sort((a, b) => b.ttload - a.ttload).forEach(lib => lib.ttload > 50 && log('LibLoadTime', lib.ttload + "ms to load " + lib.file, 'warn'));


console.log();
console.log();
log('Libs', 'Loading all Lilium libraries', 'info');
const loadTimes = [];
const rrequire = file => {
    clearCache();

    const now = Date.now();
    const lib = require(file);
    const ttload = Date.now() - now;

    loadTimes.push({ file, ttload, lib });

    return lib;
};

const fs = require('fs');
const exclusion = ["gardener.js", "runscript.js", "index.prod.js", "masthead.js", "touchstone.js"];
const corefiles = fs.readdirSync(".").filter(x => x.endsWith('.js') && !exclusion.includes(x)).map(x => "./" + x); 
corefiles.forEach(file => {
    rrequire(file);
});

loadTimes.sort((a, b) => b.ttload - a.ttload).forEach(lib => lib.ttload > 500 && log('LoadTime', lib.ttload + "ms to load " + lib.file, 'warn'));



console.log();
console.log();
log('Lilium', 'Computing the total load time', 'info');
clearCache();

const corenow = Date.now();
corefiles.forEach(file => require(file));

const initTime = Date.now() - corenow;
log('Lilium', 'Total load time for loading everything is ' + initTime + 'ms', 'lilium');


