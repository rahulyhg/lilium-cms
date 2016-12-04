var log = require('./log.js');
var livevars = require('./livevars.js');
var postleaf = require('./postleaf.js');
var db = require('./includes/db.js');
var hooks = require('./hooks.js');

var Album = function() {
    var that = this;

    this.registerPostLeaf = function() {
        postleaf.registerLeaf('album', 'Album', 'addAlbumToPost', 'editAlbumToPost', 'renderAlbum');

        hooks.bind('article_deepfetch', 50, function(conf, article, cb) {
            if (article.feature !== "album" || !article.featuredata || article.featuredata.length == 0) { return cb() };

            that.getArticleImages(conf, article._id, function(arr) {
                article.featuredata.fullpics = arr;
                cb();
            });
        });
    };

    this.getArticleImages = function(conf, postid, cb) {
                db.find(conf, 'content', {_id : db.mongoID(postid)}, [], function(err, cur) {
                    cur.hasNext(function(err, hasnext) {
                        cur.next(function(err, article) {
                            var arr = article.featuredata.photos;
                            db.findToArray(conf, 'uploads', {_id : {$in : arr}}, function(err, arr) {
                                cb(arr);
                            });
                        });
                    });
                }, {featuredata : 1});
    }

    this.registerLiveVar = function() {
        livevars.registerLiveVariable('album', function(cli, levels, params, cb) {
            if (levels.length == 0) {
                cb("[AlbumLivevarException] Need at least one level");
            } else if (levels[0] == "images") {
                var postid = levels[1];
                that.getArticleImages(cli._c, postid, cb);
            } else {
                cb("[AlbumLivevarException] Unknown level " + levels[0]);
            }
        });
    };

    this.handlePOST = function(cli){
        // URL : domain/admin/album
        if (cli.hasRightOrRefuse('create-articles')) {
            var postid = cli.routeinfo.path[3];
            if (cli.routeinfo.path[2] == "createnew") {
                var conds = {
                    _id : db.mongoID(postid),
                    feature : null
                };

                if (!cli.hasRight('editor')) {
                    conds[author] = db.mongoID(cli.userinfo.userid);
                };

                db.update(cli._c, 'content', conds, {feature : 'album', featuredata : {photos : []}}, function() {
                    cli.sendJSON({done : true});
                });
            } else if (cli.routeinfo.path[2] == "update") {
                var photos = JSON.parse(cli.postdata.data.photos);
                var conds = {
                    _id : db.mongoID(postid),
                    feature : 'album'
                };

                if (!cli.hasRight('editor')) {
                    conds[author] = db.mongoID(cli.userinfo.userid);
                };

                var photoids = [];
                for (var i = 0; i < photos.length; i++) {
                    photoids.push(db.mongoID(photos[i]));
                }

                db.update(cli._c, 'content', conds, {featuredata : {photos : photoids}}, function() {
                    cli.sendJSON({done : true});
                });
            } else {
                cli.throwHTTP(404, 'ENDPOINT LEVEL NOT FOUND');
            }
        }
    }
};

module.exports = new Album();
