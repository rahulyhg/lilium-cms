const log = require('./log.js');
const fs = require('fs');
const request = require('request');
const pathlib = require('path');
const Admin = require('./backend/admin.js');
const mkdirp = require('mkdirp');
const dateformat = require('dateformat');
const db = require('./includes/db.js');

class EmbedController {
    livevar(cli, levels, params, sendback) {
        const action = levels[0];
        const network = levels[1];

        if (action == "single") {
            db.findUnique(cli._c, 'embeds', { _id : db.mongoID(network) }, (err, embed) => {
                sendback({ embed });
            });
        } else if (action == "fetch") {
            db.findUnique(cli._c, 'embeds', { type : network, originalurl : params.url }, (err, embed) => {
                if (embed) {
                    sendback({ embed });
                } else {
                    this.fetch(cli._c, db.mongoID(cli.userinfo.userid), network, params.url, (err, embed) => {
                        if (embed) {
                            db.insert(cli._c, 'embeds', embed, () => {
                                sendback({ embed });
                            });
                        } else {
                            sendback({ err, embed });
                        }
                    });
                }
            });
        } else if (action == "bunch") {
            const $match = { };

            params.filters = params.filters || {};
            if (params.filters.type)   { $match.type = params.type; }
            if (params.filters.search) { $match.originalurl = new RegExp(params.filters.search, 'i'); }

            const $limit = 50;
            const $skip = $limit * ( params.skip ? parseInt(params.skip) : 0 );

            db.join(cli._c, 'embeds', [
                { $match },
                { $sort : { _id : -1 } },
                { $skip },
                { $limit },
            ], items => {
                sendback({ items });
            });
        } else {
            cli.throwHTTP(404, 'Undefined action ' + action, true);
        }
    }

    fetch(_c, userid, network, url, done) {
        if (network == "instagram" || network == "igcarousel" || network == "igvideo") {
            log('Embed', 'Fetching embed information from Instagram API', 'info');
            request.get({ json : true, url : "https://api.instagram.com/oembed/?url=" + url }, (err, r, data) => {
                if (data && data.thumbnail_url) {
                    log('Embed', 'Got valid response from Instagram, about to cache embed', 'success');
                    const now = new Date();
                    const dirpath = pathlib.join(_c.server.html, 'staticembed', dateformat(now, 'yyyy/mm/dd'));
                    const filename = "igembed_" + 
                        Math.random().toString(16).substring(2) +
                        Math.random().toString(16).substring(2) + "_" +
                        Math.random().toString(16).substring(2) + "." + data.thumbnail_url.split('.').pop(); 

                    const urlpath = "/" + pathlib.join('staticembed', dateformat(now, 'yyyy/mm/dd'), filename);

                    mkdirp(dirpath, () => {
                        request.get(data.thumbnail_url).on('end', (err, r) => {
                            log('Embed', 'Piped embed file as ' + filename, 'success');

                            done(undefined, {
                                userid,
                                urlpath,

                                at : Date.now(),
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
                        }).pipe(fs.createWriteStream(pathlib.join(dirpath, filename)));
                    });
                } else {
                    log('Embed', `Got an unexpected response from Instagram`, 'warn');
                    log('Embed', data, 'warn');

                    done(err || r.status);
                }
            });
        } else if (network == "twitter") {
            request({url : "https://publish.twitter.com/oembed?omit_script=1&url=" + url, json:true}, (err, r, data) => {
                if (data && data.html) {
                    done(undefined, {
                        userid,
                        at : Date.now(),
                        type : network,
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
        } else if (network == "fbpost" || network == "fbvideo") {
            request({url : "https://www.facebook.com/plugins/" + (network == "fbpost" ? "post" : "video") + "/oembed.json/?url=" + url, json:true}, (err, r, data) => {
                if (data && data.html) {
                    done(undefined, {
                        userid, 
                        at : Date.now(),
                        type : network, 
                        pagename : data.author_name,
                        pageurl : data.author_url,
                        embedurl : data.url,
                        originalurl : url, 
                        html : data.html
                    });
                } else {
                    done(err || r.status);
                }
            });
        } else if (network == "soundcloud") {
            done(undefined, {
                userid, 
                at : Date.now(),
                type : network, 
                originalurl : url,
                html : `<iframe src="https://w.soundcloud.com/player/?url=${url}" width="100%" height="320" frameborder="0"></iframe>`
            });
        } else if (network == "reddit") {
            const fromarr = url.split('/');
            const from = "https://" + fromarr.splice(2, 3).join('/')
            done(undefined, {
                userid, 
                at : Date.now(),
                type : network,
                originalurl : url,
                html : `<blockquote class="reddit-card" data-card-created="${Math.floor(Date.now() / 1000)}"><a href="${url}">${url}</a> from <a href="${from}">${from}</a></blockquote>`
            });
        } else if (network == "youtube") {
            const videoid = url.split('v=')[1].split('&')[0];
            if (!videoid) {
                return done("Missing 'v' parameter");
            }

            done(undefined, {
                userid, 
                at : Date.now(),
                type : network, 
                originalurl : url, 
                html : `<iframe src="https://www.youtube.com/embed/${videoid}" allow="autoplay; encrypted-media" width="640" height="360" frameborder="0"></iframe>`
            });
        } else if (network == "vimeo") {
            request({url : "https://vimeo.com/api/oembed.json?url=" + url, json : true}, (err, r, data) => {
                if (data && data.html) {
                    done(undefined, {
                        userid,
                        at : Date.now(),
                        type : network,
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
                userid,
                at : Date.now(),
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
