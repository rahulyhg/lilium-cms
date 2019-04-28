const sizes = {};
class ImageSize{

    /**
     * name : [width, height]
     */
    add(name, width, height) {
        if (this.exists(name)) log('ImageSize', new Error("[ImageSizeException] - Image size already exists: " + name));
        sizes[name] = [width, height];
    }

    remove(name) {
        if (!this.exists(name)) log('ImageSize', new Error("[ImageSizeException] - Image size doesn't exists: " + name));
        delete sizes[name];
    }

    exists(name) {
        return typeof sizes[name] != 'undefined';
    }

    getSizes() {
        return sizes;
    }

    debug() {
        console.log(sizes);
    }
}

module.exports = new ImageSize();
