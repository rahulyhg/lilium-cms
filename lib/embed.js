const fs = require('fs');
const asyncnoop = require('./asyncnoop');
const request = require('request');
const pathlib = require('path');
const mkdirp = require('mkdirp');
const dateformat = require('dateformat');
const db = require('./db.js');
const urllib = require('url');

class EmbedLib {
    fetch(_c, userid, network, url, done, dontdownload) {
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
                        Math.random().toString(16).substring(2) + "." + urllib.parse(data.thumbnail_url).pathname.split('.').pop(); 

                    mkdirp(dirpath, () => {
                        asyncnoop(!dontdownload, fetchdone => {
                            request.get(data.thumbnail_url)
                            .on('error', err => {
                                log('Embed', 'Error while fetching embed thumbnail from Instagram ' + err, 'err');
                                fetchdone(err);
                            })
                            .on('response', resp => {
                                if (resp.statusCode >= 200 && resp.statusCode < 300) {
                                    log('Embed', 'Fetching embed thumbnail from Instagram', 'info');
                                    resp.pipe(fs.createWriteStream(pathlib.join(dirpath, filename)))
                                    .on('error', err => {
                                        log('Embed', `Problem piping thumbnail stream to file ${filename} ${err}`, 'error');
                                        fetchdone(err, resp);                                    
                                    })
                                    .on('finish', () => {
                                        log('Embed', 'Piped embed file as ' + filename, 'success');
                                        const urlpath = "/" + pathlib.join('staticembed', dateformat(now, 'yyyy/mm/dd'), filename);
                                        fetchdone(undefined, resp, urlpath);
                                    });
                                } else {
                                    log('Embed', 'Instagram API responded with a non 2XX status code when fetching embed thumbnail, defaulting to placeholder. Code ' + resp.statusCode, 'warning')
                                    // Embed thumbnail will default to instagram placeholder
                                    const urlpath = '/' + pathlib.join('static', 'media', 'ig_media_placeholder.png');
                                    fetchdone(undefined, resp, urlpath);
                                }
                            });
                        }, (err, r, urlpath) => {
                            if (!err && urlpath) {
                                request.get({ json : true, url : url + (url.includes('?') ? '&' : '?') + "__a=1" }, (err, r, moredata) => {
                                    const fullauthor = moredata && 
                                        moredata.graphql &&
                                        moredata.graphql.shortcode_media &&
                                        moredata.graphql.shortcode_media.owner;
    
                                    done && done(undefined, {
                                        userid,
                                        urlpath,
                                        filename,
    
                                        at : Date.now(),
                                        originalurl : url,
                                        imageurl : data.thumbnail_url,
                                        width : data.thumbnail_width,
                                        height : data.thumbnail_height,
                                        id : data.media_id,
                                        author : data.author_name,
                                        authorurl : data.author_url,
                                        fullauthor : fullauthor && {
                                            verified : fullauthor.is_verified,
                                            avatar : fullauthor.profile_pic_url,
                                            displayname : fullauthor.full_name
                                        },
                                        caption : data.title,
                                        type : network,
                                        html : data.html || ""
                                    });
                                });
                            } else {
                                done && done(err);
                            }
                        });
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
            const requrl = "https://www.facebook.com/plugins/" + (network == "fbpost" ? "post" : "video") + "/oembed.json?url=" + url.split('?')[0]
            request({
                url : requrl, 
                json:true, 
                headers : {
                    "User-Agent" : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36"
                }
            }, (err, r, data) => {
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
                html : url,
                type : network
            });
        }
    }

    adminPOST(cli) {
        cli.throwHTTP(501, undefined, true);
    }
}

module.exports = new EmbedLib();
