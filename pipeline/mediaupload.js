const db = require('../lib/db.js');
const fs = require('fs');
const xxhash = require('xxhashjs');
const mkdirp = require('mkdirp');
const path = require('path');
const dateFormat = require('dateformat');
const imageResizer = require('../lib/imageResizer.js');

// Used to make the hashed name of a file unique.
let fileUniqueNumber = 0;
const SUPPORTEDFILETYPES = [
    'jpeg', 'jpg', 'png', 'gif'
]

class File {

    constructor(extension) {
        this.uploadDate = new Date();
        this.extension = extension;
        this.name = this.generateFileNameHash(extension);
        this.baseDirectory = path.join(global.liliumroot, 'backend', 'static','u', dateFormat(this.uploadDate, 'yyyy/mm/dd'));
        this.absolutePath = path.join(this.baseDirectory, this.name);
        this.url =path.join('u', dateFormat(this.uploadDate, 'yyyy/mm/dd'), this.name);
    }

    fromPostData(req, done) {
        mkdirp(this.baseDirectory, () => {
            const fileStream = fs.createWriteStream(this.absolutePath, { flags: 'w+', encoding: 'binary' });

            fileStream.on('close', () => {
                fileStream.destroy();
                done && done();
            });

            req.pipe(fileStream);
        });
    }

    /**
     * Generates a 32 character long hash as the basename of a file using Date.now() and a unique random integer as seed
     * @param {string} extension The extension of the file, without the dot
     */
    generateFileNameHash(extension) {
        let basename = '';
        for (let i = 0; i < 2; i++) {
            basename += xxhash.h64(this.uploadDate.getTime().toString() + (fileUniqueNumber++).toString() + this.filename).digest().toString(16);
        }

        return `${basename}.${extension}`;
    }

    toJSON() {
        return JSON.stringify({
            name: this.name,
            url: path.join('static','u', dateFormat(this.uploadDate, 'yyyy/mm/dd'), this.name)
        });
    }
}

class ImageFile extends File {
    
    constructor(inboundStream, extension) {
        super(inboundStream, extension);
    }

    generateResizedVersions(cli, done) {
        imageResizer.resizev4(this, cli._c, (err, images, oSize) => {
            const upload = {
                filename: this.name,
                uploader: db.mongoID(cli.userinfo.userid),
                path: this.baseDirectory,
                fullurl : this.url,
                v : 4,
                size: oSize,
                type: 'image',
                sizes: images
            };

            db.insert(cli._c, 'uploads', upload, () => {
                done && done(err, upload);
            });
        });
    }
}

class MediaUpload {

    handleImageUpload(cli) {
        if (cli.routeinfo.path[2] && SUPPORTEDFILETYPES.includes(cli.routeinfo.path[2].toLowerCase())) {
            let newImage = new ImageFile(cli.routeinfo.path[2].toLowerCase());
            newImage.fromPostData(cli.request, () => {
                newImage.generateResizedVersions(cli, (err, upload) => {
                    if (!err) {
                        cli.sendJSON(upload);
                    } else {
                        log('Upload', err, 'err');
                        cli.throwHTTP(500, "An error occured while trying to resize the image file", true);
                    }
                });
            });
        } else {
            cli.throwHTTP(400, 'Invalid or no file extention was provided', true);
        }
    }
}

module.exports = new MediaUpload();
