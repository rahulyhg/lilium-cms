const BAR_PADDING = "[] xxx%".length;
const LEVEL_TO_COLOR = {
    ">" : "\x1b[34m",
    "#" : "\x1b[36m",
    "+" : "\x1b[32m",
    "-" : "\x1b[33m",
    "x" : "\x1b[31m",

    reset : "\x1b[0m"
};

class Logger {
    constructor(totalOps) {
        this.out = process.stdout;
        this.totalOps = totalOps;
        this.op = 0;
    }

    makeGlobal(name) {
        global[name] = this.log.bind(this);
    }

    addOps(ops) {
        this.totalOps += ops;
    }

    init() {
        this.out.write("\n".repeat(this.out.rows));
        this.log("Starting up");
    }

    skipOps(skipped) {
        this.op += skipped;
        this.log();
    }

    makeProgressBar() {
        const barAvailableSpace = this.out.columns - BAR_PADDING;
        let eqNum = Math.floor(this.op / this.totalOps * barAvailableSpace);
        let percent = Math.floor(this.op / this.totalOps * 100);

        if (eqNum > barAvailableSpace) {
            eqNum = barAvailableSpace;
        }

        if (percent > 100) {
            percent = 100;
        }

        return `\x1b[45m\x1b[37m${"█".repeat(eqNum)}${" ".repeat(barAvailableSpace - eqNum)} \x1b[1m${percent}%\x1b[0m`;
    }

    clearBar() {
        this.out.clearLine();
        this.out.cursorTo(0);
    }

    log(text, level = ">", inc) {
        this.clearBar();
        inc && this.op++;

        text && this.out.write(LEVEL_TO_COLOR[level] + "[" + level + "] " + text + LEVEL_TO_COLOR.reset + "\n");
        this.out.write(this.makeProgressBar())
    }
}

module.exports = Logger;
