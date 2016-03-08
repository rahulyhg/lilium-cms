var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var fs = require('./fileserver.js');
var log = require('./log.js');
var livevars = require('./livevars.js');
var imageResizer = require('./imageResizer.js');
var imageSize = require('image-size');

var Media = function() {
	this.handlePOST = function(cli) {
		cli.touch('article.handlePOST');
		switch (cli.routeinfo.path[2]) {
			case 'upload':
				this.upload(cli);
				break;
			case 'delete' :
				this.delete(cli);
				break;
			default:

		}
	};

	this.handleGET = function(cli) {
		cli.touch('article.handleGET');
		switch (cli.routeinfo.path[2]) {
			case 'upload':
				this.upload(cli);
				break;
			case 'view' :
				this.view(cli);
				break;
			case 'getMedia' :
				this.getMedia(cli);
				break;
			case 'list' :
				this.list(cli);
				break;
			default:
				return cli.throwHTTP(404, 'Not Found');
				break;
		}
	};

	this.list = function(cli) {
		//Find the 25 first for now
		//TODO find a way to load more
		db.find(cli._c, 'uploads', {},{limit:[25]}, function(err, cursor) {
			var medias = new Array();
			var extra = new Object();
			extra.medias = medias;

			cursor.each(function(err, media) {
				if (media != null) {
					medias.push(media);
				} else {
					filelogic.serveAdminLML(cli, false, extra);
				}
			});
		});

	}

	this.upload = function(cli) {
		cli.touch('media.new');

      if (!formBuilder.isAlreadyCreated('media_create')) {
        createMediaForm();
      }

      if (cli.method == 'POST') {
        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);

        if (response.success) {

            var image = formBuilder.serializeForm(form);
            var extensions = image.File.split('.');
            var mime = extensions[extensions.length-1];
            var saveTo = cli._c.server.base + "backend/static/uploads/" +image.File;

            if (cli._c.supported_pictures.indexOf('.' + mime) != -1) {
                imageResizer.resize(saveTo, image.File, mime, cli, function(images){

                    // Save it in database
                    db.insert(cli._c, 'uploads', {path : saveTo, url : image.File, name : "Full Size", size : imageSize(saveTo), type : 'image', sizes: images}, function (err, result){

                        cli.sendJSON({
                            form: {redirect : '' ,success : true}
                        });

                    });

                });
        } else {
            cli.sendJSON({
                form: response
            });
        }
          // var url = conf.default.server.url + "/uploads/" + cli.postdata.uploads[0].url;
          // Create post

        } else {
					cli.sendJSON({
						form: response
					});
				}

      } else {
        filelogic.serveAdminLML(cli);
      }

	};

	this.delete = function(cli) {
		if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {
			var id = new mongo.ObjectID(cli.routeinfo.path[3]);

			db.find(cli._c, 'uploads', {'_id' : id},{limit:[1]}, function(err, cursor) {
				cursor.next(function(err, media) {
					if (media) {
						for (size in media.sizes){
							fs.deleteFile(media.sizes[size].path, function(err){
								log("file : " + media.sizes[size].path + " removed.");
							});
						}

						//Delete original
						fs.deleteFile(media.path, function(err){
							log("file : " + media.path + " removed.");
						});

						db.remove(cli._c, 'uploads', {_id : id},function(err, r){
							return cli.sendJSON({
								redirect: '/admin/media/list',
								success: true
							});
						});

					} else {
						cli.throwHTTP(404, 'Media Not Found');
					}
					cursor.close();
				});
			});


		} else {
			return cli.throwHTTP(404, 'Media Not Found');
		}
	}

	this.view = function(cli) {
		if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {

			var id = new mongo.ObjectID(cli.routeinfo.path[3]);
			db.exists(cli._c, 'uploads', {_id : id}, function(exists) {
				if (exists) {
					filelogic.serveAdminLML(cli, true, {id : id});
				} else {
					cli.throwHTTP(404, 'Media Not Found');
				}
			});

		} else {
			cli.throwHTTP(404, 'Media Not Found');
		}
	}

	this.getMedia = function(cli){
		var id = new mongo.ObjectID(cli.routeinfo.path[3]);
		db.find(cli._c, 'uploads', {'_id' : id},{limit:[1]}, function(err, cursor) {
			cursor.next(function(err, media) {
				if (media) {
					cli.sendJSON({
						data: media
					});
				} else {
					cli.throwHTTP(404, 'Media Not Found');
				}
				cursor.close();
			});
		});

	}

	this.registerMediaLiveVar = function() {
		livevars.registerLiveVariable('media', function(cli, levels, params, callback) {
			var wholeDico = levels.length === 0;
			if (wholeDico) {
				db.singleLevelFind(cli._c, 'uploads', callback);
			} else {
				db.multiLevelFind(cli._c, 'uploads', levels, {_id:new mongo.ObjectID(levels[0])}, {limit:[1]}, callback);
			}
		}, ["media"]);

		livevars.registerLiveVariable('uploads', function(cli, levels, params, callback) {
			var allMedia = levels.length === 0;

			if (allMedia) {
				db.singleLevelFind(cli._c, 'uploads', callback);
			} else {
				db.multiLevelFind(cli._c, 'uploads', levels, {_id:new mongo.ObjectID(levels[0])}, {limit:[1]}, callback);
			}
		}, ["uploads"]);
	}

	var createMediaForm = function() {
    formBuilder.createForm('media_create')
      .add('File', 'file')
      .add('publish', 'submit');
  }
	var init = function() {};

	init();
}

module.exports = new Media();
