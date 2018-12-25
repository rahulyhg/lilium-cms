const cluster = require('cluster');

global.__TEST = true;
global.__TEST_COOKIE = Math.random().toString(16).substring(2);
global.liliumroot = require('path').join(__dirname, '..', '..');

cluster.isMaster && console.log('> Waiting for Lilium...');
global.__START_TESTS = (lilium, core) => {
    if (core.isElder) {
        console.log('> Compiling tests');
        const Runner = require('./runner');
        const runner = new Runner();

        runner.run(lilium, core);
    }
}

process.on('uncaughtException', err => {
    console.log('An uncaught error caused the tests to exit early');
    console.log(err);

    process.send && process.send("testsFinished");
    process.exit(1);
});

require('../../index.prod.js');
