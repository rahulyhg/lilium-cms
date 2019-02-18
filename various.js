
var db = require('./includes/db.js');

var VariousWrap = function(col, type) {
    this.collection = col;
    this.type = type;
};

VariousWrap.prototype.getCollection = function() {
    return this.collection;
};

VariousWrap.prototype.add = VariousWrap.prototype.insert = function(object, cb) {
    object.type = this.type;
    this.collection[object.length ? "insertMany" : "insertOne"](object, cb);
};

VariousWrap.prototype.update = function(selector, object, cb) {
    selector.type = this.type;
    this.collection.updateMany(selector, {
        $set : object
    }).then(cb || function() {});
};

VariousWrap.prototype.get = VariousWrap.prototype.find = function(selector, cb, array, projection) {
    selector.type = this.type;
    var cursor = this.collection.find(selector);

    if (projection) {
        cursor = cursor.project(projection);
    }

    if (array) {
        cursor.toArray(cb);
    } else {
        cursor.next(cb);
    }
};

var Various = function() {};
Various.prototype.init = function(conf, done) {
    db.createIndex(conf, 'various', { type : "text" }, function() {
        done && done();
    });
};

Various.prototype.getCollection = function(conf, type, cb) {
    db.rawCollection(conf, 'various', {strict : true}, function(col) {
        cb(new VariousWrap(col, type));
    })
};

module.exports = new Various();
