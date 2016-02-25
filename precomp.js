var _c = require('./config.js');
var log = require('./log.js');
var LML = require('./lml.js');
var db = require('./includes/db.js');
var fileserver = require('./fileserver.js');
var checksum = require('checksum');

var Precomp = function() {
	var absReadPath = _c.default.server.base + "backend/dynamic/precomp/";
	var absWritePath = _c.default.server.html + "/compiled/";

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
									LML.executeToFile(
										absReadPath + curFile,
										absWritePath + curFile.slice(0, -4),
										function() {
											db.insert('compiledfiles', {
												filename : curFile,
												sum : sum
											}, function() {
												nextFile();
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
