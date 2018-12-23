const fs = require('fs');
const pathlib = require('path');
const Logger = require('./log');

const tests = fs.readdirSync(pathlib.join(__dirname, 'tests')).filter(x => !x.startsWith('.')).map(file => require(pathlib.join(__dirname, 'tests', file)));

class Runner {
    constructor() {
        this.testIndex = -1;
        this.stats = { errors : 0, success : 0 }
        this.errors = [];
    }

    nextTest(logger, done) {
        const CurrentTest = tests[++this.testIndex];
        if (CurrentTest) {
            const currentTest = new CurrentTest(logger);
            currentTest.prepare(() => {
                currentTest.run((success, failedTask, failedIndex) => {
                    this.stats[success ? "success" : "errors"]++;
                    if (failedTask) {
                        this.errors.push(failedTask);
                    }

                    currentTest.cleanUp(() => {
                        setImmediate(() => this.nextTest(logger, done));
                    });
                });
            });
        } else {
            done();
        }
    }

    run(lilium, core) {
        const logger = new Logger(2);
        logger.init();
        logger.makeGlobal("l");

        l("About to run " + tests.length + " tests");
        this.nextTest(logger, () => {
            l("All done!", '#', true);

            l("Successful tests : " + this.stats.success, "+");
            if (this.stats.errors == 0) {
                l("No errors during any of the tests", '+');
            } else {
                l("There were " + this.state.erros + " during the tests", '-');
            }

            logger.clearBar();
            process.send("testsFinished");
            process.exit(0);
        });
    }
}

module.exports = Runner;
