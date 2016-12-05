var nameMaxLength = 18;
var pid = process.pid;

var separator = "";
for (var i = 0; i < nameMaxLength; i++) {
    separator += " ";
}

var levels = {
    none : "\x1b[0m",
    err : "\x1b[31m",
    success : "\x1b[32m",
    warn : "\x1b[33m",
    info : "\x1b[34m",
    detail : "\x1b[2m",
    live : "\x1b[36m",
    lilium : "\x1b[35m"
}

module.exports = function (sender, message, level) {
    var color = level ? levels[level] : levels.none;
    if (typeof message !== 'undefined') {
        var spacing = nameMaxLength - sender.length;
        console.log("\x1b[2m["+pid+"]\x1b[0m"+color+"[" + new Date() + " - \x1b[1m" + sender + "\x1b[0m" + color + "]" + (spacing > 0 ? separator.substr(0, spacing) : '') + message + levels.none);
    } else {
        console.log('');
    }
}
