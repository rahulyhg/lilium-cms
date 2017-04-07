var log = require('./log.js');
var request = require('request');
var Admin = require('./backend/admin.js');
var db = require('./includes/db.js');

var Embed = function() {};

var createDivFromResponse = function(data) {
    return '<div class="lml-instagram-embed-wrapper"><img src="'+data.thumbnail_url+                  
        '" class="lml-instagram-embed" /><a class="lml-instagram-op" href="'+                                                       
        data.author_url +'">via @'+data.author_name+'</a></div><p></p>';
}

var handleRequest = function(cli) {
    var url = cli.routeinfo.params.url;
    var type = cli.routeinfo.params.type;

    switch (type) {
        case "instagram":
            request.get({url:"https://api.instagram.com/oembed?url=" + url, json:true}, function(err, r, data) {
                cli.response.end(createDivFromResponse(data));
            })
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
