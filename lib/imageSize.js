var ImageSize = function () {

    /**
     * name : [width, height]
     */
    var sizes = {};

    this.add = function (name, width, height) {
        if (this.exists(name)) log('ImageSize', new Error("[ImageSizeException] - Image size already exists: " + name));
        sizes[name] = [width, height];
    }

    this.remove = function (name) {
        if (!this.exists(name)) log('ImageSize', new Error("[ImageSizeException] - Image size doesn't exists: " + name));
        delete sizes[name];
    }

    this.exists = function (name) {
        return typeof sizes[name] != 'undefined';
    }

    this.getSizes = function () {
        return sizes;
    }

    this.debug = function() {
        console.log(sizes);
    }
}

module.exports = new ImageSize();
