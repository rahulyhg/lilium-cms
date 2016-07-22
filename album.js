var log = require('./log.js');
var livevars = require('./livevars.js');
var postleaf = require('./postleaf.js');

var Album = function() {
    this.registerPostLeaf = function() {
        postleaf.registerLeaf('album', 'Album', 'addAlbumToPost', 'renderAlbum');
    };
};

module.exports = new Album();