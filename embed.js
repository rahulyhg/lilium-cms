var log = require('./log.js');
var request = require('request');
var Admin = require('./backend/admin.js');
var db = require('./includes/db.js');

class EmbedController {
    livevar(cli, levels, params, sendback) {
        const action = levels[0];
        const network = levels[1];

        if (action == "single") {
            cli.throwHTTP(503, 'Method not implemented', true);
        } else if (action == "fetch") {
            this.fetch(network, params.url, (err, embed) => {
                sendback({ err, embed });
            });
        } else {
            cli.throwHTTP(404, 'Undefined action ' + action, true);
        }
    }

    fetch(network, url, done) {
        if (network == "instagram" || network == "igcarousel") {
            request.get({ json : true, url : "https://api.instagram.com/oembed/?url=" + url }, (err, r, data) => {
                if (r.status == 200 && data && data.thumbnail_url) {
                    done(undefined, {
                        originalurl : url,
                        imageurl : data.thumbnail_url,
                        width : data.thumbnail_width,
                        height : data.thumbnail_height,
                        id : data.media_id,
                        author : data.author_name,
                        authorurl : data.author_url,
                        caption : data.title,
                        type : network,
                        html : network == "igcarousel" ? data.html : ""
                    });
                } else {
                    done(err || r.status);
                }
            });
        } else if (network == "twitter") {
            request({url : "https://publish.twitter.com/oembed?omit_script=1&url=" + url, json:true}, (err, r, data) => {
                if (r.status == 200 && data && data.html) {
                    done(undefined, {
                        originalurl : url,
                        author : data.author_name, 
                        authorurl : data.author_url,
                        width : data.width,
                        html : data.html
                    })
                } else {
                    done(err || r.status);
                }
            });
        } else if (network == "vimeo") {
            request({url : "https://vimeo.com/api/oembed.json?url=" + url, json : true}, (err, r, data) => {
                if (r.status == 200 && data && data.html) {
                    done(undefined, {
                        originalurl : url,
                        caption : data.title,
                        author : data.author_name,
                        authorurl : data.author_url,
                        html : data.html,
                        width : data.width,
                        height : data.height,
                        description : data.description, 
                        thumbnail : data.thumbnail_url,
                        thumbnailplay : data.thumbnail_url_with_play_button,
                        id : data.video_id,
                        date : new Date(data.upload_date)
                    })
                } else {
                    done(err || r.status);
                }
            });
        } else {
            done(undefined, {
                originalurl : url,
                type : network
            });
        }
    }

    adminPOST(cli) {

    }
}

var handleRequest = function(cli) {
    var url = cli.routeinfo.params.url;
    var type = cli.routeinfo.params.type;
    var as = cli.routeinfo.params.as;

    switch (type) {
        case "vimeo":
            request({url : "https://vimeo.com/api/oembed.json?url=" + url, json : true}, (err, r, data) => {
                data && data.html ? cli.sendJSON({
                    data : data,
                    markup : data.html
                }) : cli.sendJSON({
                    data : {},
                    markup : ""
                });
            });
            break;
    }
};


module.exports = new EmbedController();
