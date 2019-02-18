
const db = require('../includes/db.js');

const runThrough = (_c, arr, done) => {
    let assoc = {};
    arr.forEach(t => {
        assoc[t._id] = t;
        t.family = [];
    });

    arr.forEach(t => {
        let par = assoc[t.parent];
        t.family.push(t._id);
        while(par) {
            t.family.push(par._id);
            par = assoc[par.parent];
        }
    });

    db.remove(_c, 'topics', {}, () => {
        db.insert(_c, 'topics', arr, () => {
            done();
        });
    });
}

module.exports = (_c, done) => {
    db.findToArray(_c, 'topics', {}, (err, arr) => {
        runThrough(_c, arr, done);
    });
};
