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

var Handler = function() {
	var GET = function(cli) {
		cli.touch('handler.GET');

		Router.parseClientObject(cli);
		Dispatcher.dispatch(cli);
	};

	var POST = function(cli) {
		cli.touch('handler.POST');
		cli.postdata = new Object();
		cli.postdata.length = cli.request.headers["content-length"];
		cli.postdata.data = {};
		var req = cli.request;
		var isSupported = true
		var busboy = new Busboy({ headers: req.headers });

		busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
			if (mimeTypeIsSupported(mimetype)) {

				var filename = crypto.randomBytes(10).toString('hex') + filename + dateFormat(new Date(), "isoDateTime");
				filename = crypto.createHash('md5').update(filename).digest('hex');
				var saveTo = config.default.server.base + "backend/static/uploads/" +filename+ getMimeByMimeType(mimetype);

				// Save it in database
				db.insert('uploads', {path : saveTo}, function (err, result){
					cli.postdata.uploads = [];
					cli.postdata.uploads.push(result.ops[0]);
				});

				file.pipe(fs.createWriteStream(saveTo));
			} else {
				file.resume();
				isSupported = false;
				return notSupported(cli);
			}
    });

		busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
			cli.postdata.data[fieldname] = inspect(val).slice(1,-1);
    });

    busboy.on('finish', function() {
			if (isSupported){
				Router.parseClientObject(cli);
				Dispatcher.dispost(cli);
			}

    });
    req.pipe(busboy);
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
