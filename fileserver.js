var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var _c = require('./config.js');

var FileServer = function() {
	this.fileExists = function(fullpath, cb) {
		fs.lstat(fullpath, function(err, stats) {
			if (err) {
				cb(false);
				return;
			}

			if (stats.isDirectory()) {
				fullpath += "/index.html";
			}

			fs.access(fullpath, fs.F_OK, function(err) {
				cb(!err);
			});
		});
	};

	this.dirname = function(fullpath) {
		return path.dirname(fullpath);
	};

	this.createDirIfNotExists = function(fullpath, callback) {
		var dirname = path.dirname(fullpath);
		mkdirp(dirname, function(err) {
			callback(!err);
		});
	};

	this.readFile = function(filename, callback) {
		this.fileExists(filename, function(exists) {
			if (exists) {
				fs.readFile(filename, "binary", function(err, file) {
					callback(file);
				});
			} else {
				callback(undefined);
			}
		});
	};

	this.pipeFileToClient = function(cli, filename, callback) {
		cli.touch('fileserver.pipeFileToClient');
		filename = this.validateIndexPath(cli, filename);

		var stream = fs.createReadStream(filename)
		stream.pipe(cli.response);
		
		stream.on('close', function() {
			cli.response.end();
			callback();
		});
	};

	this.validateIndexPath = function(cli, filename) {
		if (!cli.routeinfo.isStatic && filename.indexOf("index.html") == -1) {
			filename += "/index.html"
		}

		return filename;
	};

	this.getOutputFileHandle = function(filename) {
		return fs.createWriteStream(filename, {
			flags : 'a+',
			defaultEncoding : 'utf8',
			mode : 0o644
		});
	};

	this.writeToFile = function(handle, content, callback) {
		handle.write(content, 'utf8', callback);
	};

	this.closeFileHandle = function(handle, callback) {
		handle.end();
	};

	this.serveRelFile = function(cli, filename) {

	};

	this.serveAbsFile = function(cli, fullpath) {
		cli.touch('fileserver.serveAbsFile');
		this.pipeFileToClient(cli, fullpath, function() {
			cli.touch("fileserver.serveAbsFile.callback");
		});
	};

	this.serveIndex = function(cli, dirpath) {

	};

	var init = function() {

	};

	init();
};

module.exports = new FileServer();
