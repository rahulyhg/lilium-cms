module.exports = (_c, done) => {
    require('../includes/db.js').createCollection(_c, 'cakepops', done);
}
