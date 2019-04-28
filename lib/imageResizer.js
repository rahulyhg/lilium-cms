const sizes = require('./imageSize.js');
const fs = require('fs');
const gm = require('gm').subClass({imageMagick: true});

class ImageResizer{
    resize(path, filename, mime, _c, cb) {
        const images = {};
        const fileName = filename;
        const sizeKeys = Object.keys(sizes.getSizes());
        const imageSizes = sizes.getSizes();
        const currentFilename = path;
        const extension = mime;
        log("ImageResizer", "Resizing image " + filename + " ["+mime+"]");

        fs.readFile(path, (err, buffer) => {
            this.execute(buffer, sizeKeys.length - 1, _c, () => {
                gm(buffer, path).size((err, size) => {
                    return cb(images, size || err);
                });
            }, extension, sizeKeys, imageSizes, images, currentFilename, fileName);
        });
    };

    resizev4(image, _c, cb) {
        const images = {};
        const sizeKeys = Object.keys(sizes.getSizes());
        const imageSizes = sizes.getSizes();

        log("ImageResizer", "Resizing image " + image.name + " ["+image.extension+"]");
        fs.readFile(image.absolutePath, (err, buffer) => {
            if (!err) {
                this.execute(buffer, sizeKeys.length - 1, _c, () => {
                    gm(buffer, image.absolutePath).size((err, size) => {
                        if (!err) {
                            return cb(undefined, images, size);
                        } else {
                            return cb(err);
                        }
                    });
                },  image.extension, sizeKeys, imageSizes, images, image.absolutePath, image.name);
            } else {
                return cb(err);
            }
        });
    };

    execute(buffer, i, _c, cb, extension, sizeKeys, imageSizes, images, currentFilename, fileName) {
        if (i >= 0) {
            if (buffer === null) console.log(err)

            const key = sizeKeys[i]
            let width = imageSizes[key][0];
            let height = imageSizes[key][1];

            if (imageSizes[key][0] == "*") {
                width = null 
            } else if (imageSizes[key][1] == "*") {
                height = null
            } 

            const resizedEndName = "_" + (width||"rel") + "x" + (height||"rel") + "." + extension
            const resizedFilename = currentFilename + resizedEndName;

            let queue = gm(buffer, currentFilename);

            if (extension != "gif") {
                queue = queue.resize(width, height, "^")
                .strip()
                .gravity('Center');

                if (extension == "jpg" || extension == "jpeg") {
                    queue.quality(50);
                } else if (extension == "png") {
                    queue.quality(90).colors(254);
                }

                if (width && height) {
                    queue.crop(width, height, '!')
                }
            }

            queue.write(resizedFilename, (err) => {
                if (err) {
                    log("ImageResizer", err, 'err');
                }

                images[key] = {};
                images[key].path = resizedFilename;
                images[key].url = _c.server.url + require('./media').getRelativeUrlForNew("/") + fileName + resizedEndName;
                images[key].width = width || "relative";
                images[key].height = height || "relative";

                this.execute(buffer, i - 1, _c, cb, extension, sizeKeys, imageSizes, images, currentFilename, fileName);
            });
        } else {
            return cb(images)
        };
    };
};

module.exports = new ImageResizer();
