var db = require('./includes/db.js');
var moment = require('moment');

var ArticleHelper = function() {
    var that = this;

    this.getPostElements = function(cli, extra, cb) {
        // Convert date to readable one
        extra.date = moment(extra.date).format('LL');
        console.log(extra.date);
        db.findToArray(cli._c, 'entities', {_id : db.mongoID(extra.author)}, function(err, res){
            if (res[0]) {
                extra.author = res[0];
            }
            db.findToArray(cli._c, 'uploads', {_id: db.mongoID(extra.media)}, function(err, res) {
                if (res[0]) {
                    extra.media = res[0];
                }
                db.aggregate(cli._c, 'content', [{$match: {_id : {$ne : db.mongoID(extra._id)}, status : 'published'}}, {$sample : {size: 3}}, {$project: {name: 1, title: 1}}], function(res) {
                    if (res) {
                        extra.morefromsite = res;
                    }
                    that.getRelated(cli, extra, function(extra) {
                        that.getNewest(cli, extra, cb)
                    })
                });
            });

        });
    };

    this.getRelated = function(cli, extra, cb) {
        db.aggregate(cli._c, 'content', [{$match: {_id : {$ne : db.mongoID(extra._id)}, status : 'published'}}, {$sample : {size: 3}}, {$project: {name: 1, title: 1, category:1, media:1,  categories: 1}}, {$unwind : {path: "$categories",preserveNullAndEmptyArrays: true}}, {$lookup : {from: 'uploads', localField: 'media', foreignField: '_id', as : 'media'}},{$lookup : {from: 'categories', localField: 'categories', foreignField: 'name', as : 'category'}}], function(res) {
            extra.related = res;
            cb(extra)
        });
    };

    this.getNewest = function(cli, extra, cb) {
        db.aggregate(cli._c, 'content', [{$match: {_id : {$ne : db.mongoID(extra._id)}, status : 'published'}}, {$sort : {'date' : -1}}, {$max : 3}, {$project: {name: 1, title: 1, category:1, media:1,  categories: 1}}, {$unwind : {path: "$categories",preserveNullAndEmptyArrays: true}}, {$lookup : {from: 'uploads', localField: 'media', foreignField: '_id', as : 'media'}},{$lookup : {from: 'categories', localField: 'categories', foreignField: 'name', as : 'category'}}], function(res) {
            extra.newest = res;
            cb(extra)
        });
    };
};

module.exports = new ArticleHelper();
