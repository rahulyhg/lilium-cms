var _c = require('./config.js');
var log = require('./log.js');
var LML = require('./lml.js');
var db = require('./includes/db.js');
var fileserver = require('./fileserver.js');
var checksum = require('checksum');
var compressor = require('node-minify');
var frontend = require('./frontend.js');
var log = require('./log.js');

var Precomp = function() {
	var minifyFile = function(inFile, outFile, filetype, callback) {
		log('Precompiler', 'Minifying ' + filetype + ' file');

            if (filetype == 'css') {
                new compressor.minify({
                    type: 'yui-css',
                    fileIn: inFile,
                    fileOut: outFile,
                    callback: function(err, min) {
                        if (err) {
                            console.error(err);
                        } else {
                            callback(err, min)
                        };
                    }
                });
            } else if (filetype == 'js') {
                new compressor.minify({
                    type: 'yui-js',
                    fileIn: inFile,
                    fileOut: outFile,
                    callback: function(err, min) {
                        if (err) {
                            console.error(err);
                        } else {
                            callback(err, min)
                        };
                    }
                });
            } else {
                fileserver.copyFile(inFile, outFile, callback);
            }

	};

	var runLoop = function(conf, readycb) {
		var absReadPath = conf.server.base + "backend/dynamic/precomp/";
		var absWritePath = conf.server.html + "/compiled/";
		var tempPath = conf.server.html + "/static/tmp/";
		
		var fileIndex = 0;
		log('Precompiler', 'Precompiling static files');
		fileserver.listDirContent(absReadPath, function(fileArr) {
			db.findToArray(conf, 'compiledfiles', {}, function(err, histo) {

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
									log('Precompiler', 'Precompiling static file : ' + curFile);
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
												db.insert(conf, 'compiledfiles', {
													filename : curFile,
													sum : sum
												}, function() {
													nextFile();
												});
											});
										},
										{minify:false}
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

	var mergeJS = function(conf, readycb) {
		var files = frontend.getJSQueue('admin');
		var compiledPath = conf.server.html + "/compiled/admin.js";
		var fHandle = fileserver.getOutputFileHandle(compiledPath, 'w+');
		var fileIndex = 0;
		var fileTotal = files.length;

		log('Precompiler', 'Merging ' + fileTotal +' Javascript files of admin context');
		var nextFile = function() {
			if (fileIndex != fileTotal) {
				fileserver.pipeFileToHandle(fHandle, files[fileIndex], function() {
					log('Precompiler', 'Appended ' + files[fileIndex]);
					fileIndex++;
					nextFile();
				});
			} else {
				fileserver.closeFileHandle(fHandle);
				log('Precompiled', 'Merged ' + fileIndex + ' JS files');
				readycb();
			}
		};
		nextFile();
	};

	var mergeCSS = function(conf, readycb) {
		var files = frontend.getCSSQueue('admin');
		var compiledPath = conf.server.html + "/compiled/admin.css";
		var fHandle = fileserver.getOutputFileHandle(compiledPath, 'w+');
		var fileIndex = 0;
		var fileTotal = files.length;

		log('Precompiler', 'Merging ' + fileTotal +' CSS files of admin context');
		var nextFile = function() {
			if (fileIndex != fileTotal) {
				fileserver.pipeFileToHandle(fHandle, files[fileIndex], function() {
					log('Precompiler', 'Appended ' + files[fileIndex]);
					fileIndex++;
					nextFile();
				});
			} else {
				fileserver.closeFileHandle(fHandle);
				log('Precompiled', 'Merged ' + fileIndex + ' CSS files');
				readycb();
			}
		};
		nextFile();
	};

	this.precompile = function(conf, readycb) {
		fileserver.createDirIfNotExists(conf.server.html + "/compiled/", function() {
			runLoop(conf, function() {
				mergeJS(conf, function() {
					mergeCSS(conf, readycb);
				});
			});
		}, true);
	};
};

module.exports = new Precomp();
