var db = require('./includes/db.js');
var moment = require('moment');
var sites;

var ArticleHelper = function() {
    var that = this;

    this.getPostElements = function(cli, extra, cb) {
        // Convert date to readable one
        extra.date = moment(extra.date).format('LL');
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
        db.aggregate(cli._c, 'content', [{$match: {_id : {$ne : db.mongoID(extra._id)}, status : 'published'}}, {$sample : {size: 3}}, {$project: {name: 1, title: 1, category:1, media:1,  categories: 1}}, {$lookup : {from: 'uploads', localField: 'media', foreignField: '_id', as : 'media'}},{$unwind : {path: "$categories",preserveNullAndEmptyArrays: true}}, {$lookup : {from: 'categories', localField: 'categories', foreignField: 'name', as : 'category'}},{$unwind : {path: "$category",preserveNullAndEmptyArrays: true}}, {$unwind : {path: "$media",preserveNullAndEmptyArrays: true}}], function(res) {
            extra.related = res;
            cb(extra)
        });
    };

    this.getNewest = function(cli, extra, cb) {
        db.aggregate(cli._c, 'content', [{$match: {_id : {$ne : db.mongoID(extra._id)}, status : 'published'}}, {$sort : {'date' : -1}}, {$limit : 3}, {$project: {name: 1, title: 1, categories : 1, category:1, media:1,  categories: 1}}, {$lookup : {from: 'uploads', localField: 'media', foreignField: '_id', as : 'media'}},{$unwind : {path: "$categories",preserveNullAndEmptyArrays: true}}, {$lookup : {from: 'categories', localField: 'categories', foreignField: 'name', as : 'category'}},{$unwind : {path: "$category",preserveNullAndEmptyArrays: true}}, {$unwind : {path: "$media",preserveNullAndEmptyArrays: true}}], function(res) {
            extra.newest = res;
            if (extra.newest[0]) {
                extra.newest[0].size = 'medium';
            }
            cb(extra)
        });
    };


    this.homepageTrending = function (cli, extra, cb) {
        db.aggregate(cli._c, 'content', [{$match : {'trending' : true}}, {$limit : 3}, {$project : {name:1, media :1, title: 1, size: {$literal : 'small'}}}], function(res) {
            extra.trending = res;
            if (extra.trending[0]) {
                extra.trending[0].size = 'medium';
            }
            cb(extra)

        });
    };

    this.homepageNew = function (cli, extra, cb) {
        db.aggregate(cli._c, 'content', [{$match: {status : 'published'}}, {$sort : {'date' : -1}}, {$limit : 8}, {$project: {name: 1, title: 1, category:1, media:1,  categories: 1, size : {$literal : 'small'}}}, {$lookup : {from: 'uploads', localField: 'media', foreignField: '_id', as : 'media'}},{$unwind : {path: "$categories",preserveNullAndEmptyArrays: true}}, {$lookup : {from: 'categories', localField: 'categories', foreignField: 'name', as : 'category'}},{$unwind : {path: "$category",preserveNullAndEmptyArrays: true}}, {$unwind : {path: "$media",preserveNullAndEmptyArrays: true}}], function(res) {
            extra.new = res;
            if (extra.new[0]) {
                extra.new[0].size = 'medium';
            }
            cb(extra)

        });
    };

    this.homepageBestOf = function(cli, extra, cb) {
        db.aggregate(cli._c, 'content', [{$match: {categories : {$in: [/(best-of.*)/]}}}, {$sample : {size: 3}}, {$project : {name:1, media :1, title: 1, size:{$literal : 'small'}, categories : 1}}, {$lookup : {from: 'uploads', localField: 'media', foreignField: '_id', as : 'media'}},{$unwind : {path: "$categories",preserveNullAndEmptyArrays: true}}, {$lookup : {from: 'categories', localField: 'categories', foreignField: 'name', as : 'category'}},{$unwind : {path: "$category",preserveNullAndEmptyArrays: true}}, {$unwind : {path: "$media",preserveNullAndEmptyArrays: true}}], function(res) {
            extra.bestof = res;
            if (extra.bestof[0]) {
                extra.bestof[0].size = 'medium';
            }
            cb(extra)

        });
    };

    this.homepageThingsToDo = function(cli, extra, cb) {
        db.aggregate(cli._c, 'content', [{$match: {categories : { $in: [/(things-to-do.*)/]}}}, {$sample : {size: 3}}, {$project : {name:1, media :1, title: 1, size:{$literal : 'small'}}}, {$lookup : {from: 'uploads', localField: 'media', foreignField: '_id', as : 'media'}},{$unwind : {path: "$categories",preserveNullAndEmptyArrays: true}}, {$lookup : {from: 'categories', localField: 'categories', foreignField: 'name', as : 'category'}},{$unwind : {path: "$category",preserveNullAndEmptyArrays: true}}, {$unwind : {path: "$media",preserveNullAndEmptyArrays: true}}], function(res) {
            extra.thingstodo = res;
            if (extra.thingstodo[0]) {
                extra.thingstodo[0].size = 'medium';
            }
            cb(extra);

        });
    };

    this.getHomepageSuggested = function(cli, extra, cb) {
        sites = require('./sites.js');
        var siteList = sites.getSites();
        var site = siteList[Math.floor(Math.random() * ((Object.keys(siteList).length)))];
        db.aggregate(site, 'content',[{$sample : {size: 2}}, {$lookup : {from: 'uploads', localField: 'media', foreignField: '_id', as : 'media'}}, {$unwind : '$media'}, {$project : {name:1, media :1, title: 1, conf:{$literal : site}}}], function(arr) {
            extra.suggested = arr;
            cb(extra);
        });
    };

    this.getHomepageArticles = function(cli, cb) {
        var extra = {};
        this.homepageTrending(cli, extra, function(extra) {
            that.homepageNew(cli, extra, function(extra) {
                that.homepageBestOf(cli, extra, function(extra) {
                    that.homepageThingsToDo(cli, extra, function(extra) {
                        that.getHomepageSuggested(cli, extra, function(extra) {

                            cb(extra);
                        });
                    });
                });
            });
        });
    };
};

module.exports = new ArticleHelper();
