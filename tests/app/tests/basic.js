const Request = require('../request');
const Test = require('../test');

class BasicTest extends Test {
    constructor(logger) {
        super('Basic Lilium requests', [
            new Request().to('GET', '/'),
            new Request().to('GET', '/login')
        ], logger);
    }
}

module.exports = BasicTest;
