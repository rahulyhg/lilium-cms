var log = require('./log.js');
var livevars = require('./livevars.js');
var postleaf = require('./postleaf.js');
var imageResizer = require('./imageResizer.js')

var Album = function() {
    this.registerPostLeaf = function() {
        postleaf.registerLeaf('album', 'Album', 'addAlbumToPost', 'renderAlbum');
    };

    this.handlePOST = function(cli){
		var imagefile = cli.routeinfo.path[3]
    	var mime = cli.routeinfo.path[4]
    	var saveTo = cli._c.server.base + "backend/static/uploads/" + imagefile

    	console.log("IMG_NAME=" + imagefile)
    	console.log("IMG_TYPE=" + mime)
    	console.log("IMG_PATH=" + saveTo)

    	cli.response.write("ok")
    	cli.response.end()

    	// imageResizer.resize(saveTo, imagefile, cli._c, function(){
    	// 	console.log("RESIZE SUCCESS")
    	// })
    }
};

module.exports = new Album();
