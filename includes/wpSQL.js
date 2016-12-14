var fetchPosts = "SELECT ID, post_author, post_date, post_content, post_title, post_status, post_name, post_type FROM wp_posts WHERE post_type = 'post' OR post_type = 'qquiz' OR post_type = 'page'";
var fetchAttachmentIDs = "select ID, post_date, guid from wp_posts where post_type = 'attachment'";
var fetchAttachmentMetas = "select post_id, meta_key, meta_value from wp_postmeta m INNER JOIN wp_posts p ON p.ID = m.post_id where post_type = 'attachment' AND m.meta_value NOT LIKE '\\_%'"
var fetchCategories = "select t.term_id, t.name, t.slug from wp_terms t INNER JOIN wp_term_taxonomy tax ON tax.term_id = t.term_id WHERE tax.taxonomy = 'category'";
var fetchTagsForPosts = "SELECT ID, slug, name FROM wp_term_relationships JOIN wp_term_taxonomy ON wp_term_relationships.term_taxonomy_id = wp_term_taxonomy.term_taxonomy_id JOIN wp_terms ON wp_terms.term_id = wp_term_taxonomy.term_id INNER JOIN wp_posts p ON p.ID = object_id AND taxonomy = 'post_tag'";
var fetchCatsForPosts = "SELECT ID, slug, name FROM wp_term_relationships JOIN wp_term_taxonomy ON wp_term_relationships.term_taxonomy_id = wp_term_taxonomy.term_taxonomy_id JOIN wp_terms ON wp_terms.term_id = wp_term_taxonomy.term_id INNER JOIN wp_posts p ON p.ID = object_id AND taxonomy = 'category'";
var fetchPostsMetas = "select post_id, meta_key, meta_value from wp_postmeta WHERE (meta_key NOT LIKE '\\_%' OR meta_key = '_thumbnail_id')";
var fetchUsers = "SELECT ID, user_login, user_nicename, user_email, user_url, user_registered, display_name FROM wp_users WHERE user_login NOT REGEXP '^[0-9]+$'";
var fetchUsersMetas = "select user_id, meta_key, meta_value from wp_usermeta WHERE meta_key NOT LIKE '\\_%'";
var importantUserMetas = ["first_name", "last_name", "description", "wp_capabilities", "wp_user_level", "googleplus", "twitter", "facebook", "date_of_birth", "gender"];

var db = require('./db.js');
var mysql = require('mysql');
var log = require('../log.js');
var request = require('request');
var fs = require('fs');
var imageSize = require('image-size'); 
var imageResizer = require('../imageResizer.js');
var conf = require('./config.js');

// Wordpress ID => Lilium Mongo ID
var cachedUsers = new Object();

var ftCategories = function(siteid, mysqldb, done) {
    mysqldb.query(fetchCategories, function(err, wp_cat) {
        var catIndex = 0;
        var catTotal = wp_cat.length;

        var nextCat = function() {
            if (catIndex < catTotal) {
                var cat = wp_cat[catIndex];
                catIndex++;

                db.findToArray(siteid, 'categories', {wpid : cat.term_id}, function(err, arr) {
                    if (arr.length !== 0) {
                        return nextCat();
                    }

                    db.insert(siteid, 'categories', {
                        name : cat.slug,
                        displayname : cat.name,
                        wpid : cat.term_id
                    }, nextCat);
                });
            } else {
                wp_cat = undefined;
                log('WP', 'Created all ' + catTotal + ' categories');
                done();
            }
        };
    
        nextCat();
    });
};

var ftUsers = function(siteid, mysqldb, done) {
    cachedUsers[siteid] = new Object();

    mysqldb.query(fetchUsers, function(err, wp_users) {
        if (err) {
            log('WP', 'Error fetching users : ' + err);
            return;
        }

        var userTotal = wp_users.length;
        var userIndex = 0;

        var nextUser = function() {
            if (userIndex < userTotal) {
                var wp_user = wp_users[userIndex];         
                userIndex++;
    
                db.findToArray(conf.default(), 'entities', {wpid : wp_user.ID}, function(err, arr) {
                    if (arr.length !== 0) {
                        return nextUser();
                    }

                    mysqldb.query(fetchUsersMetas + " AND user_id = " + wp_user.ID, function(err, wp_usermeta) {
                        var userdata = {};
                        wp_usermeta.forEach(function(meta, i) {
                            userdata[meta.meta_key] = meta.meta_value;
                        });
    
                        db.insert(conf.default(), 'entities', {
                            wpid : wp_user.ID,
                            username : wp_user.user_login,
                            shhh : "0c4c440a9684f73788048e6e45e047f7eddc1d24ff25c77600d932d741f4b0bc", // narcitymedia1+
                            pwdmustchange : true,
                            wptransferred : true,
                            email : wp_user.user_email,
                            firstname : wp_usermeta.first_name,
                            lastname : wp_usermeta.last_name,
                            description : wp_usermeta.description,
                            displayname : wp_user.display_name,
                            createdOn : new Date(wp_user.user_registered),
                            avatarID : null,
                            avatarURL : "",
                            roles : [parseWPRole(userdata.wp_capabilities)],
                            preferences : {
                                topbuttontext : "Publish",
                                topbuttonlink : "/admin/article/new"
                            },
                            data : userdata
                        }, function(err, r) {
                            cachedUsers[siteid][wp_user.ID] = r.insertedId;
    
                            if (userIndex > 0 && userIndex % 10 == 0) {
                                log('WP', 'Created ' + userIndex + ' entities');
                            }
    
                            nextUser();
                        });
                    });
                });
            } else {
                wp_users = undefined;
                done();
            }
        };

        nextUser();
    });
};

var ftPosts = function(siteid, mysqldb, done) {
    mysqldb.query(fetchPosts, function(err, wp_posts) {
        var totalRows = wp_posts.length;
        var postIndex = 0;
        var postTotal = wp_posts.length;

        log('WP', 'Transferring around ' + postTotal + " posts");
        var wpPostStartAt = new Date();
        var nextPost = function() {
            setTimeout(function() {
                if (postIndex < postTotal) {
                    var wp_post = wp_posts[postIndex];
    
                    if (wp_post.post_status == 'inherit' || wp_post.post_status == 'auto-draft' || wp_post.post_title == "") {
                        postIndex++;
                        nextPost();
                    } else {
                        db.findToArray(siteid, 'content', {"data.wp_id" : wp_post.ID}, function(err, arr) {
                            if (arr.length != 0) {
                                postIndex++;
                                nextPost();
                                return;
                            }

                            mysqldb.query(fetchPostsMetas + " AND post_id = " + wp_post.ID, function(err, wp_postmeta) {
                                var postdata = {};
                                wp_postmeta.forEach(function(meta, i) {
                                    postdata[meta.meta_key] = meta.meta_value;
                                });
                                postdata.wp_author = wp_post.post_author;
                                postdata.wp_id = wp_post.ID;

                                var contentRegex = /^(.+)$/gm;
                                mysqldb.query(fetchTagsForPosts + " WHERE ID = " + wp_post.ID, function(err, wp_tags) {
                                    mysqldb.query(fetchCatsForPosts + " WHERE p.ID = " + wp_post.ID, function(err, wp_cats) {
                                        db.insert(siteid, 'content', {
                                            status : wp_post.post_status == 'publish' ? 'published' : wp_post.post_status,
                                            title : wp_post.post_title,
                                            subtitle : postdata.subtitle,
                                            data : postdata,
                                            name : wp_post.post_name,
                                            date : new Date(wp_post.post_date),
                                            content : wp_post.post_content.replace(contentRegex, "<p>$1</p>"),
                                            type : wp_post.post_type,
                                            wptype : wp_post.post_type,
                                            categories : wp_cats.length ? [wp_cats[0].slug] : [],
                                            tags : wp_tags.map(function(wptag) { return wptag.name }),
                                            author : db.mongoID(cachedUsers[siteid][wp_post.post_author])
                                        }, function() {
                                            postIndex++;
    
                                            if (postIndex > 0 && postIndex % 250 == 0) {
                                                var postPerSec = parseFloat(250 / ((new Date() - wpPostStartAt) / 1000.00)).toFixed(2);
                                                log('WP', 'Created ' + 
                                                    postIndex + ' / ' + postTotal + ' posts at ' + 
                                                    postPerSec + ' posts per second');
    
                                                wpPostStartAt = new Date();
                                            }
                                        
                                            setTimeout(nextPost, 0);
                                        });
                                    });
                                });
                            });
                        });
                    }
                } else {
                    wp_posts = undefined;
                    log('WP', 'Done creating posts. Total : ' + postTotal);
                    done();
                }
            }, 1);
        };

        nextPost();
    });
};

var ftUploads = function(siteid, mysqldb, done) {
    var Media = require('../media.js');
    var cconf = require('../config.js').fetchConfig(siteid);
    var fu = require('../fileserver.js');

    var oUrl = cconf.wordpress.originalurl;
    if (oUrl.charAt(oUrl.length-1) == "/") {
        oUrl = oUrl.substring(0, oUrl.length-1);
    }

    var localUploadDir = cconf.wordpress.wpuploadslocaldir;
    var isLocal = localUploadDir !== "";

    log('WP', 'Querying uploads');
    mysqldb.query(fetchAttachmentIDs, function(err, uploads) {
        mysqldb.end();

        var uploadTotal = uploads.length;

        var threadNumbers   = 10;
        var threadIndices   = new Array(threadNumbers);
        var threadDone      = 0;

        for (var i = 0; i < threadNumbers; i++) {
            threadIndices[i] = i;
        }

        log('WP', 'Queried ' + uploadTotal + ' uploads. Ready to request', 'lilium');
        var nextUpload = function(threadid) {
            if (threadIndices[threadid] < uploadTotal) {
                var upload = uploads[threadIndices[threadid]];
                var uUrl = upload.guid;

                if (threadIndices[threadid] > 0 && threadIndices[threadid] % 50 == 0) {
                    log('WP', 'Transferred ' + threadIndices[threadid] + ' / ' + uploadTotal + ' files', 'success');
                }

                if (!isLocal) {
                    uUrl = oUrl + uUrl.substring(uUrl.indexOf('/uploads'));

                    log('WP', 'Downloading image ' + uUrl);
                    request(uUrl, function(error, response, body) {
                        handleSingle(error, body, upload, threadid);
                    });
                } else {
                    var filename = localUploadDir + uUrl.substring(uUrl.indexOf('/uploads') + 8);

                    log('WP', 'Transferring local image ' + filename);
                    fu.readFile(filename, function(file, err) {handleSingle(err, file, upload, threadid);});
                }
            } else {
                log('WP', 'Done transferring uploads for thread ' + threadid + " at index " + threadIndices[threadid], 'lilium');
                threadDone++;

                if (threadDone == threadNumbers) {
                    done();
                }
            }
        };

        var handleSingle = function(error, body, upload, threadid) {
            var filename = upload.ID + "_" + fu.genRandomNameFile(upload.ID) + "." + upload.guid.split('.').pop();
            var saveTo = cconf.server.base + "backend/static/uploads/" + filename;

            if (!error) {
                fu.fileExists(saveTo, function(exists) {
                    if (exists) {
                        log('WP', 'Skipping eisting file : ' + saveTo, 'detail');
                        threadIndices[threadid] += threadNumbers; 
                        nextUpload(threadid);
                    } else {
                        fs.writeFile(saveTo, body, {encoding : 'binary'}, function() {
                            require('../media.js').handleUploadedFile(cconf, filename, function(err, result) {
                                if (err) {
                                    log('WP', 'Invalid image download');
                                    threadIndices[threadid]+=threadNumbers;
                                    nextUpload(threadid);
                                } else {
                                    var objid = result.insertedId;
                                    log('WP', 'Inserted media with mongo ID ' + objid);
                                    db.update(cconf, 'content', 
                                        {"data._thumbnail_id" : upload.ID.toString()}, 
                                        {"media" : (typeof objid == "string" ? db.mongoID(objid) : objid) }, 
                                    function(ue, r) {
                                        if (r.modifiedCount != 0) {
                                            log('WP', "Affected featured image for a found article", 'info');
                                        }
    
                                        threadIndices[threadid]+=threadNumbers;
                                        nextUpload(threadid);
                                    });
                                }
                            }, true, {wpid : upload.ID, wpguid : upload.guid});
                        });
                    }
                });
            } else {
                log('WP', 'Download error : ' + error, 'error');

                threadIndices[threadid]+=threadNumbers;
                nextUpload(threadid);
            }
        };

        for (var i = 0; i < threadNumbers; i++) {
            (function(i) {
                setTimeout(function() { 
                    nextUpload(i);
                }, 1);
            })(i);
        }
    });
};

var roleAssoc = {
    author : "author",
    administrator : "admin",
    editor : "editor",
    staff_contributor : "contributor"
};

var parseWPRole = function(roleString) {
    var rr = "wptransferred";
    for (var search in roleAssoc) {
        if (roleString.indexOf(search) !== -1) {
            rr = roleAssoc[search];
            break;
        }
    }

    return rr;
};

var transTasks = [ftUsers, ftCategories, ftPosts, ftUploads];    

var WordpressSQLToLiliumMongo = function() {
    this.transfer = function(siteid, mysqlConnInfo, callback) {
        log('WP', 'Transferring started');
        var mdb = mysql.createConnection({
            host:       mysqlConnInfo.wpsitedataurl,
            port:       mysqlConnInfo.wpsitedatapost,
            user:       mysqlConnInfo.wpsitedatauser,
            password:   mysqlConnInfo.wpsitedatapwd,
            database:   mysqlConnInfo.wpsitedataname
        });

        log('WP', 'Contacting database');
        mdb.connect(function(err) {
            if (err) {
                callback(err);
                return;
            };

            // Proceed
            log('WP', 'Database connection was established and stabilized');
            log('WP', 'Background work starting now');
            setTimeout(function() {
                runTasks(siteid, mdb, function() {
                    var Configs = require('../config.js');
                    var siteConf = Configs.fetchConfig(siteid);
                    siteConf.wptransferring = false;
                    siteConf.wptransfer = true;        
                    siteConf.wpdb = undefined;

                    Configs.saveConfigs(siteConf, function() {
                        log('Sites', 'Site configuration was saved');
                    });
                });
            }, 1);

            callback();
        });
    };

    var runTasks = function(siteid, mdb, cb) {
        var numOfTasks = transTasks.length;
        
        var next = function(i) {
            if (i < numOfTasks) {
                runWPFunction(transTasks[i], siteid, mdb, function() {
                    next(i+1);
                });
            } else {
                mdb.end(function(err) { 
                    log('WP', 'Done transferring Wordpress data to website with site id ' + siteid);
                    cb();
                });
            }
        };

        next(0);
    };

    var runWPFunction = function(func, siteid, mysqldb, done) {
        func(siteid, mysqldb, done);
    };
};

module.exports = new WordpressSQLToLiliumMongo();
