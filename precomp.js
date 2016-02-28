var _c = require('./config.js');
var log = require('./log.js');
var LML = require('./lml.js');
var db = require('./includes/db.js');
var fileserver = require('./fileserver.js');
var checksum = require('checksum');
var compressor = require('node-minify');

var Precomp = function() {
	var absReadPath = _c.default.server.base + "backend/dynamic/precomp/";
	var absWritePath = _c.default.server.html + "/compiled/";
	var tempPath = _c.default.server.html + "/static/tmp/";

	var minifyFile = function(inFile, outFile, filetype, callback) {
		log('Precompiler', 'Minifying ' + filetype + ' file');
		if (filetype == 'css') {
			new compressor.minify({
  				type: 'yui-css',
  				fileIn: inFile,
  				fileOut: outFile,
  				callback: callback
			});
		} else if (filetype == 'js') {
			new compressor.minify({
  				type: 'yui-js',
  				fileIn: inFile,
  				fileOut: outFile,
  				callback: callback
			});
		} else {
			fileserver.copyFile(inFile, outFile, callback);
		}
	};

	var runLoop = function(readycb) {
		var fileIndex = 0;
		log('Precompiler', 'Precompiling static files');
		fileserver.listDirContent(absReadPath, function(fileArr) {
			db.findToArray('compiledfiles', {}, function(err, histo) {
				
				var histoObj = new Object();

				for (var i = 0; i < histo.length; i++) {
					histoObj[histo[i].filename] = histo[i].sum;
				}

				var nextFile = function() {
					if (fileIndex < fileArr.length) {
						var curFile = fileArr[fileIndex];
						var mustRewrite = false;
						fileIndex++;

						if (curFile.indexOf('.lml') !== -1) {
							checksum.file(absReadPath + curFile, function(err, sum) {
								if (histoObj[curFile] == sum) {
									nextFile();
								} else {
									log('Precompile', 'Precompiling static file : ' + curFile);
									var rPath = absReadPath + curFile;
									var tPath = tempPath + 'precom-' + (Math.random()).toString().substring(2) + ".tmp";
									var wPath = absWritePath + curFile.slice(0, -4);
									LML.executeToFile(
										rPath,
										tPath,
										function() {
											var beforeMinify = new Date();
											minifyFile(tPath, wPath, wPath.substring(wPath.lastIndexOf('.')+1), function() {
												log("Precompiler", "Minified file to " + wPath + " in " + (new Date() - beforeMinify) + "ms");
												db.insert('compiledfiles', {
													filename : curFile,
													sum : sum
												}, function() {
													nextFile();
												});
											});
										},
										{}
									);
								}
							});
						} else {
							nextFile();
						}
					} else {
						readycb();
					}
				};

				nextFile();
			});
		});
	};

	this.precompile = function(readycb) {
		fileserver.createDirIfNotExists(absWritePath, function() {
			runLoop(readycb);
		}, true);
	};
};

module.exports = new Precomp();
