var lwip = require('lwip');
var fs = require('fs');
var log = require('./log.js');
var sizes = require('./imageSize.js');

var ImageResizer = function() {
  var extension;
	var sizeKeys;
  var imageSizes;
  var images = {};
  var currentFilename;

	this.resize = function(filename, mime, cb) {
    sizeKeys = Object.keys(sizes.getSizes());
    imageSizes = sizes.getSizes();
    currentFilename = filename;
		log("[ImageResizer] Resizing Image...");
    extension = mime;
		fs.readFile(filename, function(err, buffer) {
      //For all sizes;
      execute(buffer, mime, sizeKeys.length -1 ,function(){
        return cb(images);
      });
		});
	};

	var execute = function(buffer, mime, i, cb) {
    if (i >= 0){
      lwip.open(buffer, mime, function(err, image){

        var baseHeight = image.height();
        var baseWidth = image.width();
        var width;
        var height;
        var ratio = 1;

        if (imageSizes[sizeKeys[i]][0] == '*') {

          height = [sizeKeys[i]][1];
          ratio = baseHeight/height;
          width = baseWidth/ratio;

        } else if (imageSizes[sizeKeys[i]][1] == '*') {

          width = imageSizes[sizeKeys[i]][0];
          ratio = baseWidth / width;
          height = baseHeight / ratio;

        } else {
          width = imageSizes[sizeKeys[i]][0];
          height = imageSizes[sizeKeys[i]][1];
        }
         width = Math.floor(width);
         height = Math.floor(height);


        var resizedFilename = currentFilename + "_" + width + "x" + height + "." + extension;

        // Resize file
        image.batch()
          .cover(width, height)
          .crop(width, height)
          .writeFile(
            resizedFilename,
            extension,
            {},
            function(err) {
              images[sizeKeys[i]] = resizedFilename;
              execute(buffer,mime, i-1, cb);
            }
          );

      });
    } else {
      return cb(images);
    }

	};
};

module.exports = new ImageResizer();
