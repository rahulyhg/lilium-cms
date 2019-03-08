module.exports.forEachAsync = (arr, ftc, done) => {
    let i = 0;

    const next = () => {
        const cur = arr[i];
        if (cur) {
            i++;
            ftc(cur, () => next());
        } else {
            done();
        }
    };
    
    next();
};
