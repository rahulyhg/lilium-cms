const Request = require('../request');
const Test = require('../test');

class BasicTest extends Test {
    constructor(logger) {
        super('Basic Lilium requests', [
            new Request("Requesting to slash without params").to('GET', '/'),
            new Request("Requesting login page").to('GET', '/login')
        ], logger);
    }
}

module.exports = BasicTest;
