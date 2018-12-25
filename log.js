var nameMaxLength = 18;
var pid = process.pid;

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

var logname = process.pid;
var Log = function (sender, message, level) {
    level = level || "none";
    if (!Log.levels.includes(level)) return;

    var color = levels[level];
    if (message) {
        var spacing = nameMaxLength - sender.length;
        const now = new Date();
        console.log(
            "\x1b[2m\x1b[1m[" + logname + "]\x1b[0m" + color + 
            "[" + now.toLocaleTimeString() + " - " + sender + "\x1b[0m" + color + "]" + 
            (spacing > 0 ? " ".repeat(spacing) : '') + 
            message + levels.none
        );
    } else {
        console.log('');
    }
}

Log.levels = ["none", "err", "success", "warn", "info", "detail", "live", "lilium", undefined];

Log.setLevels = function(lvls) {
    Log.levels = lvls;
}

Log.setName = name => { logname = name.substring(0, 5).toUpperCase(); };
Log.getName = () => logname;

var LogDev = function(sender, message, level) {
    if (global.l && (level == "warn" || level == "err")) {
        global.l(`${sender} - ${message}`, level == "err" ? "x" : "-");
    }
}

var LogCI = function(sender, message, level) {
    console.log(`[${pid}][${sender}] ${message}`);
}

LogDev.setLevels = LogCI.setLevels = () => {};
LogDev.setName = LogCI.setName = Log.setName;
LogDev.getName = LogCI.getName = Log.getName;

if (global.__CI) {
    module.exports = LogCI;
} else if (global.__TEST) {
    module.exports = LogDev;
} else {
    module.exports = Log;
}
