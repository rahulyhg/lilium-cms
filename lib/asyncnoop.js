module.exports = (predicate, truthyCallback, finalCallback) => {
    if (predicate) {
        truthyCallback(() => {
            finalCallback();
        });
    } else {
        finalCallback();
    }
};
