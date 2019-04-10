module.exports = (predicate, truthyCallback, finalCallback) => {
    if (predicate) {
        truthyCallback((...arguments) => {
            finalCallback(...arguments);
        });
    } else {
        finalCallback();
    }
};
