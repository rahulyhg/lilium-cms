var log = require('./log.js');
var request = require('request');
var Admin = require('./backend/admin.js');
var db = require('./includes/db.js');

var Embed = function() {};

var createDivFromResponse = function(data) {
    return '<p><img data-width="'+data.thumbnail_width+'" data-height="'+data.thumbnail_height+'" src="'+data.thumbnail_url+                  
        '" class="lml-instagram-embed-2" /><a class="lml-instagram-op-2" href="'+                                                       
        data.author_url +'" >via @'+data.author_name+'</a></p>';
}

var createV3DivFromResponse = function(data, ourl) {
    return data.is_video ? 
            '<p contenteditable="false">'+
            '<video class="lml-instagram-video-3" data-width="'+data.dimensions.width+'" data-height="'+data.dimensions.height+'" controls>' +
            ' <source src="'+data.video_url+ '"> This video is not available.' +
            '</video><a class="lml-instagram-op-3" href="'+
            ourl +'" ><img src="'+data.owner.profile_pic_url+'" class="lml-instagram-avatar-3" /> @'+data.owner.username+
            '<span class="lml-instagram-via-3">embedded via <i class="fab fa-instagram">&nbsp;</i> </span> </a> </p>'
        : (
            '<p contenteditable="false">'+
            '<img data-width="'+data.dimensions.width+'" data-height="'+data.dimensions.height+'" src="'+data.display_url+ 
            '" class="lml-instagram-embed-3" /><a class="lml-instagram-op-3" href="'+
            ourl +'" ><img src="'+data.owner.profile_pic_url+'" class="lml-instagram-avatar-3" /> @'+data.owner.username+
            '<span class="lml-instagram-via-3">embedded via <i class="fab fa-instagram">&nbsp;</i> </span> </a> </p>'
        );
}

var handleRequest = function(cli) {
    var url = cli.routeinfo.params.url;
    var type = cli.routeinfo.params.type;
    var as = cli.routeinfo.params.as;

    switch (type) {
        case "igcarousel":
            request.get({json : true, url : "https://api.instagram.com/oembed/?url=" + url}, (err, r, data) => {
                if (data) {
                    cli.sendJSON({
                        instagram : data,
                        markup : data.html
                    });
                } else {
                    cli.sendJSON( { 
                        instagram : "", 
                        markup : '<p class="lml-instagram-embed-err">Oops. It appears <b>Instagram.com</b> responded with an error. Make sure the Instagram account is public, that the picture is still available and that Instagram is not down.</p>', 
                        error : "Invalid Instagram Response" 
                    });
                }
            });
            break;

        case "instagram":
            url += (url.includes('?') ? '&' : '?') + "__a=1";
            request.get({url, json:true}, function(err, r, data) {
                if (as == "json") {
                    data ? cli.sendJSON(data.graphql ? {
                        instagram : data.graphql.shortcode_media,
                        markup : createV3DivFromResponse(data.graphql.shortcode_media, cli.routeinfo.params.url)
                    } : data) : { instagram : "", markup : '<p class="lml-instagram-embed-err">Oops. It appears <b>Instagram.com</b> responded with an error. Make sure the Instagram account is public, that the picture is still available and that Instagram is not down.</p>', error : "Invalid Instagram Response" };
                } else {
                    cli.response.end(
                        data.graphql ? 
                            createV3DivFromResponse(data.graphql.shortcode_media, cli.routeinfo.params.url) :
                            '<p class="lml-instagram-embed-err">Oops. It appears <b>Instagram.com</b> responded with an error. Make sure the Instagram account is public, that the picture is still available and that Instagram is not down.</p>'
                    );
                }
            });
            break;

        case "fbvideo":
            cli.sendJSON({
                markup : `<div class="fb-video-wrap" contenteditable="false">
                    <div class="lml-fb-video"
                        data-href="${url}"
                        data-width="640"
                        data-allowfullscreen="true"
                        data-autoplay="true"
                        data-show-captions="true">
                    </div>  
                </div>`
            });
            break;

        case "fbpost":
            cli.sendJSON({
                markup : `<div class="fb-post-wrap" contenteditable="false">
                    <div class="lml-fb-post" data-width="640" data-href="${url}"></div>
                </div>`
            });
            break;

        case "twitter":
            request({url : "https://publish.twitter.com/oembed?omit_script=1&url=" + url, json:true}, (err, r, data) => {
                data && data.html ? cli.sendJSON({
                    data : data,
                    markup : data.html
                }) : cli.sendJSON({
                    data : {},
                    markup : ""
                });
            });
            break;

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

        case "instagram_DEPRECATED":
            request.get({url:"https://api.instagram.com/oembed?url=" + url, json:true}, function(err, r, data) {
                cli.response.end(createDivFromResponse(data));
            });
            break;
    }
};

var canRequest = function(cli) {
    return cli.hasRightOrRefuse('create-articles');
};

Embed.prototype.adminGET = function(cli) {
    cli.touch("embed.GET");
    if (canRequest(cli)) {
        handleRequest(cli);
    }
};

var scanInstagramSingle = function(cli, err, cur, done) {
    if (!err) {
        cur.hasNext(function(err, hasNext) {
            if (hasNext) {
                cur.next(function(err, obj) {
                    var ctn = obj.content ? obj.content.replace(/<p>(&nbsp;)?<\/p>/g, "").replace(/\r\n/g, "") : "";

                    var instaReg = /<p>https?\:\/\/www.instagram.com\/p\/[a-zA-Z0-9\-\_]*\/?[a-z\-\?\=0-9]*<\/p>/g;
                    var instaStrings = [];

                    while (m = instaReg.exec(ctn)) {
                        instaStrings.push(m[0].slice(3, -4));
                    }

                    if (instaStrings.length == 0) {
                        setTimeout(function() { scanInstagramSingle(cli, err, cur, done); }, 0);
                    } else { 
                        var instaindex = 0;
                        var nextInsta = function() {
                            if (instaindex > instaStrings.length) {
                                db.update(cli._c, "content", {_id : obj._id}, {content : ctn}, function() {
                                    log('Embed', 'Parsed ' + obj.title);
                                    setTimeout(function() {
                                        scanInstagramSingle(cli, err, cur, done);
                                    }, 0);
                                }, false, true);
                            } else {
                                var url = instaStrings[instaindex];
                                request.get({url:"https://api.instagram.com/oembed?url=" + url, json:true}, function(err, r, data) {
                                    ctn = ctn.replace(url, createDivFromResponse(data));                                                                     
                                    instaindex++;                                                                                          
                                    nextInsta();   
                                });
                            }
                        }

                        nextInsta();
                    }
                });
            } else {
                done();
            }
        });
    }
};

var scanImgur = function(cli, er, cur, done) {

};

Embed.prototype.scanInstagram = function(cli) {
    db.find(cli._c, "content", {}, [], function(err, cur) {
        if (err) {

        } else {
            log('Embed', 'Going through all content for Instagram links left untransformed');
            scanInstagramSingle(cli, err, cur, function() {
                require('./notifications.js').notifyUser(cli.userinfo.userid, cli._c.id, {
                    title: "Instagram",
                    msg : "Refreshed all content",
                    type: "success"
                });
            });
        }
    });
};

module.exports = new Embed();
