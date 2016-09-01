var fs = require('fs');
var log = require('./log.js');
var sizes = require('./imageSize.js');
var fs = require('fs')
  , gm = require('gm').subClass({imageMagick: true});

var ImageResizer = function () {
    this.resize = function (path, filename, mime, _c, cb) {
        var extension;
        var sizeKeys;
        var imageSizes;
        var images = {};
        var currentFilename;
        var fileName;

        fileName = filename;
        sizeKeys = Object.keys(sizes.getSizes());
        imageSizes = sizes.getSizes();
        currentFilename = path;
        log("ImageResizer", "Resizing image " + filename + " ["+mime+"]");
        extension = mime;
        fs.readFile(path, function (err, buffer) {
            execute(buffer, sizeKeys.length - 1, _c, function(){
                gm(buffer, path).size(function(err, size) {
                    return cb(images, size || err)
                });
            }, extension, sizeKeys, imageSizes, images, currentFilename, fileName);
        });
    };

    var execute = function (buffer, i, _c, cb, extension, sizeKeys, imageSizes, images, currentFilename, fileName){
        if (i >= 0) {
            if (buffer === null) console.log(err)
                var key = sizeKeys[i]
                var width = imageSizes[key][0];
                var height = imageSizes[key][1];
                var resizedEndName = "_" + width + "x" + height + "." + extension
                var resizedFilename = currentFilename + resizedEndName;

                //Give a number to the * dimentions, aspect ratio is taken care of in the gm resize crop function after
                if (imageSizes[key][0] == "*") {
                    width = imageSizes[key][1] 
                } else if (imageSizes[key][1] == "*") {
                    height = imageSizes[key][0]
                } 

                gm(buffer, currentFilename)
                .resize(width, height, "^")
                .gravity('Center')
                .crop(width, height,"!")
                .write(resizedFilename, function (err) {
                  if (!err) console.log(key + ' image upload success');
                  else console.log(err);
                    images[key] = {};
                    images[key].path = resizedFilename;
                    images[key].url = _c.server.url + '/uploads/' + fileName + resizedEndName;

                  execute(buffer, i - 1, _c, cb, extension, sizeKeys, imageSizes, images, currentFilename, fileName);
                });
            } else {
            return cb(images)
        };
    };
};

module.exports = new ImageResizer();
