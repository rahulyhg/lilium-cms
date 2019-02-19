module.exports = (_c, done) => {
    require('../lib/db.js').createCollection(_c, 'cakepops', done);
}
