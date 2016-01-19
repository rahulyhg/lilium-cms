var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var fs = require('./fileserver.js');
var log = require('./log.js');

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
		db.find('uploads', {},{limit:[25]}, function(err, cursor) {
			var medias = [];
			cursor.each(function(err, media) {
				if (media != null) {
					medias.push(media);
				} else {
					filelogic.serveLmlPage(cli, false, medias);
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
          // var url = conf.default.server.url + "/uploads/" + cli.postdata.uploads[0].url;
          // Create post
							cli.sendJSON({
								form: {redirect : '' ,success : true}
							});
        } else {
					cli.sendJSON({
						form: response
					});
				}

      } else {
        filelogic.serveLmlPage(cli);
      }

	};

	this.delete = function(cli) {
		if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {
			var id = new mongo.ObjectID(cli.routeinfo.path[3]);

			db.find('uploads', {'_id' : id},{limit:[1]}, function(err, cursor) {
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

						db.remove('uploads', {_id : id},function(err, r){
							return cli.sendJSON({
								redirect: '/admin/media/list'
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
			db.exists('uploads', {_id : id}, function(exists) {
				if (exists) {
					filelogic.serveLmlPage(cli, true);
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
		db.find('uploads', {'_id' : id},{limit:[1]}, function(err, cursor) {
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

	var init = function() {

	}

	var createMediaForm = function() {
    formBuilder.createForm('media_create')
      .add('File', 'file')
      .add('publish', 'submit');
  }


	init();
}

module.exports = new Media();
