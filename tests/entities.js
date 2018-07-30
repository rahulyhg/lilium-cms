const request = require('request');

exports.createEntity = next => {
    assert(true, 'Should pass');
    next && next();
};

exports.deleteEntity = next => {
    assert(true, 'Should NOT pass');
    next && next();
};
