const nameMaxLength = 18;

const levels = {
    none : "\x1b[0m",
    err : "\x1b[31m",
    success : "\x1b[32m",
    warn : "\x1b[33m",
    info : "\x1b[34m",
    detail : "\x1b[2m",
    live : "\x1b[36m",
    lilium : "\x1b[35m"
}

let logname = process.pid;
const Log = (sender, message, level = "none") => {
    if (!Log.levels.includes(level)) return;

    if (message) {
        const color = levels[level] || levels.none;
        const spacing = nameMaxLength - sender.length;
        console.log(
            "\x1b[2m\x1b[1m[" + logname + "]\x1b[0m" + color + 
            "[" + new Date().toLocaleTimeString() + " - " + sender + "\x1b[0m" + color + "]" + 
            " ".repeat(spacing<0?0:spacing) + message + levels.none
        );
    } else {
        console.log('');
    }
}

const LogDev = (sender, message, level) => process.send && 
    !global.__TEST_BLOCK_LOG && 
    sender && 
    message &&
    process.send({ type : 'output', payload : { sender, message, level, clear : true } });

const LogCI = (sender, message, level) => console.log(message);

Log.levels = ["none", "err", "success", "warn", "info", "detail", "live", "lilium", undefined];

Log.setLevels = lvls => Log.levels = lvls;

Log.setName = name => logname = name.substring(0, 5).toUpperCase();
Log.getName = () => logname;

LogDev.setLevels = LogCI.setLevels = () => {};
LogDev.setName = LogCI.setName = Log.setName;
LogDev.getName = LogCI.getName = Log.getName;
LogDev.levelColors = LogCI.levelColors = Log.levelColors = levels;

module.exports = global.__CI ? LogCI : global.__TEST ? LogDev : Log;
