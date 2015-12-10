var fs = require('fs');
var _c = require('./config.js');

var FileServer = function() {
	var fileExists = function(fullpath, cb) {
		fs.exists(filename, function(exists) {
			cb(exists);
		});
	};

	this.readFile = function(filename, callback) {
		fileExists(filename, function(exists) {
			if (exists) {
				fs.readFile(filename, "binary", function(err, file) {
					callback(file);
				}
			} else {
				callback(undefined);
			}
		});
	};

	this.getOutputFileHandle = function(filename) {
		return fs.createWriteStream(filename, {
			flags : 'a',
			defaultEncoding : 'utf8',
			mode : 0o644
		});
	};

	this.writeToFile = function(handle, content) {
		handle.write(content);
	};

	this.closeFileHandle = function(handle, callback) {
		handle.end();
	};

	this.serveRelFile = function(cli, filename) {

	};

	this.serveAbsFile = function(cli, fullpath) {

	};

	this.serveIndex = function(cli, dirpath) {

	};

	var init = function() {

	};

	init();
};

module.exports = new FileServer();
