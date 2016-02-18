// Will handle the requests and send info to the appropriate dispatcher
var Router = require('./router.js');
var Dispatcher = require('./dispatcher.js');
var inspect = require('util').inspect;
var Busboy = require('busboy');
var config = require('./config.js');
var fs = require('fs');
var crypto = require('crypto');
var htmlserver = require('./frontend/htmlserver.js');
var dateFormat = require('dateformat');
var db = require('./includes/db.js');
var imageResizer = require('./imageResizer.js');
var imageSize = require('image-size');
var events = require('events');
var eventEmitter = new events.EventEmitter();

var Handler = function() {
	var GET = function(cli) {
		cli.touch('handler.GET');

		Router.parseClientObject(cli);
		Dispatcher.dispatch(cli);
	};

	var POST = function(cli) {
		cli.touch('handler.POST');

		Router.parseClientObject(cli);

		cli.postdata = new Object();
		cli.postdata.length = cli.request.headers["content-length"];
		cli.postdata.data = {};

		var finishedCalled = false;
		var req = cli.request;
		var hasFile = false;

		req.headers["content-type"] = typeof req.headers["content-type"] == "undefined" ? "application/x-www-form-urlencoded": req.headers["content-type"];
		try {
			var busboy = new Busboy({ headers: req.headers });
			// File upload
			busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
				if (cli.request.headers['content-length'] > config.default.server.fileMaxSize) {
					file.resume();
					hasFile = false;
					return cli.throwHTTP(413, 'File is too large');

				} else {
					if (mimeTypeIsSupported(mimetype)) {
                        hasFile = true;

						var mime = getMimeByMimeType(mimetype);
						var filename = crypto.randomBytes(10).toString('hex') + filename + dateFormat(new Date(), "isoDateTime");
						filename = crypto.createHash('md5').update(filename).digest('hex');
						var saveTo = config.default.server.base + "backend/static/uploads/" +filename+ mime;
						var name = filename + mime;

                        file.pipe(fs.createWriteStream(saveTo));

						file.on('end', function() {
                            cli.postdata.data[fieldname] = name;
						});


					} else {

						file.resume();
						return notSupported(cli);
					}
				}

					});

			busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
				parsePOSTField(cli, fieldname, val);
				});

			busboy.on('finish', function() {
				if (!finishedCalled) {
					finishedCalled = true;
                    Dispatcher.dispost(cli);
				}

			});
			req.pipe(busboy);
		} catch(err) {
			Dispatcher.dispost(cli);

		}


	};
	var mimeTypeIsSupported = function(mimetype) {
		return  getMimeByMimeType(mimetype) ? true : false;
	}

	var getMimeByMimeType = function(mimeType) {
		var mimes = config.default.MIMES;
    for( var prop in mimes ) {
        if( mimes.hasOwnProperty( prop ) ) {
             if( mimes[ prop ] === mimeType )
                 return prop;
        }
    }
	}

	var parsePOSTField = function(cli, fieldname, val) {
		if (fieldname.indexOf('[') == -1) {
			cli.postdata.data[fieldname] = inspect(val).slice(1,-1);
		} else {
			var reg = /\[([a-zA-ZÀ-ÿ0-9]*)\]/g;
			var firstLevel = fieldname.substring(0, fieldname.indexOf('['));

			if (typeof cli.postdata.data[firstLevel] === 'undefined') {
				cli.postdata.data[firstLevel] = new Object();
			}

			var currentLevel = cli.postdata.data[firstLevel];
			var levelsTotal = (fieldname.match(/\[/g)||[]).length;
			var levelIndex = 0;
			var match = null;

			while ((match = reg.exec(fieldname)) != null) {
				var nIndex = match[1];
				levelIndex++;
				if (typeof currentLevel[nIndex] === 'undefined') {
					currentLevel[nIndex] = levelIndex == levelsTotal ? inspect(val).slice(1,-1) : new Object();
				}

				currentLevel = currentLevel[nIndex];
			}
		}
	};

	var notSupported = function(cli) {
		cli.throwHTTP(405, 'Method Not Allowed');
	};

	var parseMethod = function(cli) {
		cli.touch('handler.parseMethod');

		switch (cli.method) {
			case 'GET':
				GET(cli);
				break;
			case 'POST':
				POST(cli);
				break;
			default:
 				notSupported(cli);
				break;
		}
	};

	this.handle = function(cli) {
		cli.touch('handler.handle');
		parseMethod(cli);
	};

	var init = function() {

	};

	init();
};

module.exports = new Handler();
