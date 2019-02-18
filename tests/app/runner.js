const fs = require('fs');
const pathlib = require('path');
const Logger = require('./log');
const db = require(liliumroot + '/lib/db');
const configlib = require(liliumroot + '/config');

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
                        this.errors.push({test : currentTest, task : failedTask, index : failedIndex});
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

    createTestEnv(then) {
        db.remove(configlib.default(), 'roles', {}, () => {
            db.insert(configlib.default(), 'roles', require('./roles'), () => {
                then();
            });
        });
    }

    run(lilium, core) {
        const logger = new Logger(2);
        logger.init();
        logger.makeGlobal("l");

        l("About to run " + tests.length + " tests");
        this.createTestEnv(() => {
            this.nextTest(logger, () => {
                l("All done!", '#', true);

                l("Successful tests : " + this.stats.success, "+");
                if (this.stats.errors == 0) {
                    l("No errors during any of the tests", '+');
                } else {
                    l("There were " + this.stats.errors + " error during the tests : ", '-');
                    this.errors.forEach(err => l("  => " + err.test.name + ", task #" + (err.index+1) + " : " + err.task.displayname, 'x'));
                }

                logger.clearBar();
                process.send({ev : "testsFinished", code : this.stats.errors == 0 ? 0 : 1});
                process.exit(0);
            });
        });
    }
}

module.exports = Runner;
