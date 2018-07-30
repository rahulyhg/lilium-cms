const mongoclient = require('mongodb').MongoClient;
const request = require('request');
const { assert } = require('chai');


/**
 * Loads all the test modules into an array and passes it to the test callback
 * @param {callback} test called once all the test modules have been loaded
 */
const init = test => {
    const TESTS = {};
    
    TESTS.entities = require('./entities');

    test && test(TESTS);
};

const testModule = module => {
    
};

const runTest = test => {

};

/**
 * Calls all the test modules subscribed in the `this.init()` function.
 */
module.exports.run = () => {
    let PASSED = 0;
    let FAILED = 0;

    mongoclient.connect('mongodb://localhost:27017/liliumtest', (err, db) => {
        if (!err) {
            init(testModules => {
                const modules = Object.keys(testModules);
                testModules.forEach();
            });
        } else {
            log('Test', "Couldn't create test database", 'error');
        }
    });
};
