global.__TEST = true;
global.__CI = true;
global.__TEST_COOKIE = Math.random().toString(16).substring(2);

global.__START_TESTS = (lilium, core) => {
    if (core.isElder) {
        const Runner = require('./runner');
        const runner = new Runner();

        runner.run(lilium, core);
    }
}

require('../../index.prod.js');
