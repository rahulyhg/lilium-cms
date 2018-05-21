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

var Log = function (sender, message, level) {
    level = level || "none";
    if (!Log.levels.includes(level)) return;

    var color = levels[level];
    if (message) {
        var spacing = nameMaxLength - sender.length;
        console.log("\x1b[2m["+pid+"]["+(Date.now() - global.__STARTUPSTAMP)+"ms]\x1b[0m"+color+"[" + new Date() + " - \x1b[1m" + sender + "\x1b[0m" + color + "]" + (spacing > 0 ? separator.substr(0, spacing) : '') + message + levels.none);
    } else {
        console.log('');
    }
}

Log.levels = ["none", "err", "success", "warn", "info", "detail", "live", "lilium", undefined];

Log.setLevels = function(lvls) {
    Log.levels = lvls;
}

module.exports = Log;
