var fetchPosts = "SELECT ID, post_author, post_date, post_content, post_title, post_status, post_name, post_type FROM wp_posts WHERE post_type = 'post' OR post_type = 'qquiz' OR post_type = 'page' OR post_type = 'photos' OR post_type = 'tv' ORDER BY ID ASC";
var fetchAttachmentIDs = "select ID, post_date, guid from wp_posts where post_type = 'attachment'";
var fetchAttachmentMetas = "select post_id, meta_key, meta_value from wp_postmeta m INNER JOIN wp_posts p ON p.ID = m.post_id where post_type = 'attachment' AND m.meta_value NOT LIKE '\\_%'"
var fetchCategories = "select t.term_id, t.name, t.slug from wp_terms t INNER JOIN wp_term_taxonomy tax ON tax.term_id = t.term_id WHERE tax.taxonomy = 'category'";
var fetchTagsForPosts = "SELECT ID, slug, name FROM wp_term_relationships JOIN wp_term_taxonomy ON wp_term_relationships.term_taxonomy_id = wp_term_taxonomy.term_taxonomy_id JOIN wp_terms ON wp_terms.term_id = wp_term_taxonomy.term_id INNER JOIN wp_posts p ON p.ID = object_id AND taxonomy = 'post_tag'";
var fetchCatsForPosts = "SELECT ID, slug, name FROM wp_term_relationships JOIN wp_term_taxonomy ON wp_term_relationships.term_taxonomy_id = wp_term_taxonomy.term_taxonomy_id JOIN wp_terms ON wp_terms.term_id = wp_term_taxonomy.term_id INNER JOIN wp_posts p ON p.ID = object_id AND taxonomy = 'category'";
var fetchPostsMetas = "select post_id, meta_key, meta_value from wp_postmeta WHERE (meta_key NOT LIKE '\\_%' OR meta_key = '_thumbnail_id')";
var fetchUsers = "SELECT ID, user_login, user_nicename, user_email, user_url, user_registered, display_name FROM wp_users WHERE user_login NOT REGEXP '^[0-9]+$'";
var fetchUsersMetas = "select user_id, meta_key, meta_value from wp_usermeta WHERE meta_key NOT LIKE '\\_%'";
var importantUserMetas = ["first_name", "last_name", "description", "wp_capabilities", "wp_user_level", "googleplus", "twitter", "facebook", "date_of_birth", "gender"];

var fetchQuizPers = "SELECT * FROM wp_qquiz_post_pers";
var fetchQuizQuest = "SELECT * FROM wp_qquiz_post_quest";
var fetchQuizAnswer = "SELECT * FROM wp_quiz_quest_answer";

var db = require('./db.js');
var mysql = require('mysql');
var log = require('../log.js');
var request = require('request');
var fs = require('fs');
var imageSize = require('image-size');
var imageResizer = require('../imageResizer.js');
var conf = require('../config.js');

// Wordpress ID => Lilium Mongo ID
var cachedUsers = new Object();

/*
mysql> describe wp_qquiz_post_pers;
+----------------------+--------------+------+-----+---------+-------+
| Field                | Type         | Null | Key | Default | Extra |
+----------------------+--------------+------+-----+---------+-------+
| qquiz_post_id        | int(20)      | NO   |     | NULL    |       |
| qquiz_pers_name      | varchar(100) | YES  |     | NULL    |       |
| qquiz_pers_desc      | text         | YES  |     | NULL    |       |
| qquiz_pers_attach    | text         | YES  |     | NULL    |       |
| qquiz_pers_label     | varchar(10)  | YES  |     | NULL    |       |
| qquiz_pers_cred_name | varchar(100) | YES  |     | NULL    |       |
| qquiz_pers_cred_link | varchar(100) | YES  |     | NULL    |       |
+----------------------+--------------+------+-----+---------+-------+

describe wp_qquiz_post_quest;
+-----------------------+--------------+------+-----+---------+----------------+
| Field                 | Type         | Null | Key | Default | Extra          |
+-----------------------+--------------+------+-----+---------+----------------+
| qquiz_post_quest_id   | int(20)      | NO   | PRI | NULL    | auto_increment |
| qquiz_post_id         | int(20)      | NO   |     | NULL    |                |
| qquiz_quest_index     | int(6)       | NO   |     | NULL    |                |
| qquiz_quest_text      | text         | YES  |     | NULL    |                |
| qquiz_quest_attach    | text         | YES  |     | NULL    |                |
| qquiz_quest_cred_name | varchar(100) | YES  |     | NULL    |                |
| qquiz_quest_cred_link | varchar(100) | YES  |     | NULL    |                |
+-----------------------+--------------+------+-----+---------+----------------+

describe wp_qquiz_quest_answer;
+------------------------+--------------+------+-----+---------+-------+
| Field                  | Type         | Null | Key | Default | Extra |
+------------------------+--------------+------+-----+---------+-------+
| qquiz_post_id          | int(20)      | NO   |     | NULL    |       |
| qquiz_quest_index      | int(6)       | NO   |     | NULL    |       |
| qquiz_answer_text      | text         | YES  |     | NULL    |       |
| qquiz_answer_attach    | text         | YES  |     | NULL    |       |
| qquiz_answer_type      | varchar(5)   | YES  |     | NULL    |       |
| qquiz_pers_label       | varchar(50)  | YES  |     | NULL    |       |
| qquiz_answer_cred_name | varchar(100) | YES  |     | NULL    |       |
| qquiz_answer_cred_link | varchar(100) | YES  |     | NULL    |       |
+------------------------+--------------+------+-----+---------+-------+
*/
var ftQuiz = function(siteid, mysqldb, done) {
    mysqldb.query(fetchQuizPers, function(err, mQuizPers) {
        mysqldb.query(fetchQuizQuest, function(err, mQuizQuest) {
            mysqldb.query(fetchQuizAnswer, function(err, mQuizAnswer) {
                // wpid => personalities
                var posts = {};
                for (var i = 0; i < mQuizPers.length; i++) {
                    if (!posts[mQuizPers[i].qquiz_post_id]) {
                        posts[mQuizPers[i].qquiz_post_id].personalities = [];
                        posts[mQuizPers[i].qquiz_post_id].questions = [];
                    }

                    posts[mQuizPers[i].qquiz_post_id].personalities.push({
                        id : "pers-" + Math.random().toString(36).substring(2),
                        name : mQuizPers[i].qquiz_pers_name,
                        details : mQuizPers[i].qquiz_pers_desc,
                        wplabel : mQuizPers[i].qquiz_pers_label,
                        photo : "",
                        photourl : "",
                        photocred : mQuizPers[i].qquiz_pers_cred_name,
                        photocredlink : mQuizPers[i].qquiz_pers_cred_link,
                        photowpid : mQuizPers[i].qquiz_pers_attach
                    });
                }

                for (var i = 0; i < mQuizQuest.length; i++) {
                    posts[mQuizQuest[i].qquiz_post_id].questions.push({
                        id : "quest-" + Math.random().toString(36).substring(2),
                        answers : [],
                        interogation : mQuizQuest[i].qquiz_quest_text,
                        wplabel : mQuizQuest[i].qquiz_quest_index,
                        photo : "",
                        photourl : "",
                        photocred : mQuizQuest[i].qquiz_quest_cred_name,
                        photocredlink : mQuizQuest[i].qquiz_quest_cred_link,
                        photowpid : mQuizQuest[i].qquiz_quest_attach
                    });
                }

                for (var i = 0; i < mQuizAnswer.length; i++) {
                    var ans = mQuizAnswer[i];
                    var post = posts[ans.qquiz_post_id];
                    var quests = post.questions;
                    var persoid;                    

                    for (var j = 0; j < post.personalities.length; j++) 
                    if (ans.qquiz_pers_label.indexOf(post.personalities[j].wplabel) != -1) {
                        persoid = post.personalities[j].id;
                    }

                    post.answers.push({
                        id : "ans-" + Math.random().toString(36).substring(2),
                        photourl : "",
                        answer : ans.qquiz_answer_text,
                        personality : persoid,
                        photocred : ans.qquiz_answer_cred_name,
                        photocredlink : ans.qquiz_answer_cred_link
                    });
                }

                var wpids = Object.keys(posts);
                var curi = -1;
                var next = function() {
                    curi++;
                    if (curi == wpids.length) {
                        done();
                    } else {
                        var featuredata = posts[wpids[curi]];
                        console.log("Would insert => " + featuredata);
                    }
                };

                next();
            });
        });
    });
};
/*
            Personalities {
                "id" : "pers-u5o5ecaa17s0q1dnsl9pb9",
                "name" : "Personality 1",
                "details" : "Details 1",
                "photourl" : null,
                "photocred" : "",
                "photocredlink" : ""
            }

            "questions" : [
            {
                "id" : "quest-g2m06a9w6aua37yqb4eu3di",
                "answers" : [
                    {
                        "id" : "ans-1ulwczxxsxco368mw6jj2oi529",
                        "photourl" : null,
                        "answer" : "Answer 1",
                        "personality" : "pers-u5o5ecaa17s0q1dnsl9pb9",
                        "photocred" : "",
                        "photocredlink" : ""
                    },
                ],
                "interogation" : "Question 1",
                "photo" : "5843d5e7304c3f25b8856620",
                "photourl" : "//localhost:8080/uploads/312e872080f17cf735863288495f43a9.jpg_970x400.jpg",
                "photocred" : "Cred 1",
                "photocredlink" : "Link 1"
            }
        ]
*/

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
                    mysqldb.query(fetchUsersMetas + " AND user_id = " + wp_user.ID, function(err, wp_usermeta) {
                        var userdata = {};
                        wp_usermeta.forEach(function(meta, i) {
                            userdata[meta.meta_key] = meta.meta_value;
                        });
                    
                        if (arr.length !== 0) {
                            return db.update(conf.default(), 'entities', {
                                _id : arr[0]._id
                            }, {
                                firstname : userdata.first_name,
                                lastname : userdata.last_name,
                                description : userdata.description
                            }, function() {
                                return nextUser();
                            });
                        }

                        db.insert(conf.default(), 'entities', {
                            wpid : wp_user.ID,
                            username : wp_user.user_login,
                            shhh : "0c4c440a9684f73788048e6e45e047f7eddc1d24ff25c77600d932d741f4b0bc", // narcitymedia1+
                            pwdmustchange : true,
                            wptransferred : true,
                            email : wp_user.user_email,
                            firstname : userdata.first_name,
                            lastname : userdata.last_name,
                            description : userdata.description,
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

                    if (postIndex > 0 && postIndex % 250 == 0) {
                        var postPerSec = parseFloat(250 / ((new Date() - wpPostStartAt) / 1000.00)).toFixed(2);
                        log('WP', 'Created ' +
                            postIndex + ' / ' + postTotal + ' posts at ' +
                            postPerSec + ' posts per second');

                        wpPostStartAt = new Date();
                    }


                    if (wp_post.post_status == 'inherit' || wp_post.post_status == 'auto-draft' || wp_post.post_title == "") {
                        postIndex++;
                        nextPost();
                    } else {
                        db.findToArray(siteid, 'content', {"data.wp_id" : wp_post.ID}, function(err, arr) {
                            if (arr.length != 0) {
                                postIndex++;
                                db.findToArray(conf.default(), 'entities', {wpid : arr[0].data.wp_author}, function(err, earr) {
                                    if (earr.length == 0) {
                                        nextPost();
                                    } else {
                                        db.update(siteid, 'content', {_id : arr[0]._id}, {author : earr[0]._id}, nextPost);
                                    }
                                });
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
                                        db.findToArray(siteid, 'uploads', {wpid : postdata._thumbnail_id ? parseInt(postdata._thumbnail_id) : "---"}, function(err, wpmediaarr) {
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
                                                author : db.mongoID(cachedUsers[siteid][wp_post.post_author]),
                                                featuredimageartist : postdata.featured_image_credits_name,
                                                featuredimagelink : postdata.featured_image_credits_url,
                                                media : wpmediaarr.length == 0 ? "" : db.mongoID(wpmediaarr[0]._id)
                                            }, function() {
                                                postIndex++;
                                                setTimeout(nextPost, 0);
                                            });
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

    var wpids = [];

    log('WP', 'Querying uploads');
    mysqldb.query(fetchAttachmentIDs, function(err, uploads) {
        mysqldb.end();

        var uploadTotal = uploads.length;

        var threadNumbers   = 4;
        var threadIndices   = new Array(threadNumbers);
        var threadDone      = 0;

        for (var i = 0; i < threadNumbers; i++) {
            threadIndices[i] = i;
        }

        log('WP', 'Queried ' + uploadTotal + ' uploads. Ready to request', 'lilium');
        var nextUpload = function(threadid, retry) {
            if (threadIndices[threadid] < uploadTotal) {
                var upload = uploads[threadIndices[threadid]];
                var uUrl = upload.guid;

                if (threadIndices[threadid] > 0 && threadIndices[threadid] % 50 == 0) {
                    log('WP', 'Transferred ' + threadIndices[threadid] + ' / ' + uploadTotal + ' files', 'success');
                }

                    if (wpids.indexOf(upload.ID) != -1) {
                        log('WP', 'Skipping eisting file', 'detail');
                        threadIndices[threadid] += threadNumbers;
                        setTimeout(function() { nextUpload(threadid) }, 0);
                    } else {
                        if (!isLocal || retry == "download") {
                            uUrl = oUrl + uUrl.substring(uUrl.indexOf('/uploads'));
                            log('WP', 'Downloading image ' + uUrl);
                            request({url : uUrl, encoding : "binary"}, function(error, response, body) {
                            try {
                                var filename = cconf.server.base + "backend/static/tmp/up" + upload.ID + "." + uUrl.split('.').pop();
                                if (filename.indexOf('.com') != -1) {
                                        filename = cconf.server.base + "backend/static/tmp/up" + upload.ID + ".jpg";
                                }

                                var handle = fu.getOutputFileHandle(filename, 'a+', 'binary');
                                handle.write(body, 'binary', function(err) {
                                    handle.end(undefined, undefined, function() {
                                        fu.fileExists(filename, function(exx) {
                                            if (exx) {
                                                fu.readFile(filename, function(file, err) {handleSingle(err, file, upload, threadid,
                                                    function(valid) {
                                                        if (valid) {
                                                            fu.deleteFile(filename, function() {});
                                                        }
                                                    });
                                                });
                                            } else {
                                                threadIndices[threadid] += threadNumbers; nextUpload(threadid);
                                            }
                                        });
                                    });
                                });
                            } catch (ex) { threadIndices[threadid] += threadNumbers; nextUpload(threadid); }
                            });
                        } else {
                            var filename = localUploadDir + uUrl.substring(uUrl.indexOf('/uploads') + 8);

                            log('WP', 'Transferring local image ' + filename);
                            fu.fileExists(filename, function(exx) {
                                if (exx) {
                                    fu.readFile(filename, function(file, err) {handleSingle(err, file, upload, threadid, function(valid) {
                                            if (valid) {
                                                fu.deleteFile(filename, function() {});
                                            }
                                        });
                                    });
                                } else {
                                    nextUpload(threadid, 'download');
                                }
                            });
                        }
                    }
            } else {
                log('WP', 'Done transferring uploads for thread ' + threadid + " at index " + threadIndices[threadid], 'lilium');
                threadDone++;

                if (threadDone == threadNumbers) {
                    done();
                }
            }
        };

        var handleSingle = function(error, body, upload, threadid, cb) {
            var filename = upload.ID + "_" + fu.genRandomNameFile(upload.ID) + "." + upload.guid.split('.').pop();
            if (filename.indexOf('.com') != -1) {
                filename = upload.ID + "_" + fu.genRandomNameFile(upload.ID) + ".jpg";
            }

            var saveTo = cconf.server.base + "backend/static/uploads/" + filename;

            if (!error) {
                        fs.writeFile(saveTo, body, {encoding : 'binary'}, function() {
                            require('../media.js').handleUploadedFile(cconf, filename, function(err, result) {
                                if (err) {
                                    log('WP', 'Invalid image download');
                                    threadIndices[threadid]+=threadNumbers;
                                    cb(false);
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
                                        cb(true);
                                        nextUpload(threadid);
                                    });
                                }
                            }, true, {wpid : upload.ID, wpguid : upload.guid});
                        });
            } else {
                log('WP', 'Download error : ' + error, 'error');
                threadIndices[threadid]+=threadNumbers;
                cb(true);
                nextUpload(threadid);
            }
        };

        db.findToArray(cconf, 'uploads', {}, function(err, arr) {
            for (var i = 0; i < arr.length; i++) if (arr[i].wpid) {
                wpids.push(arr[i].wpid);
            }

            for (var i = 0; i < threadNumbers; i++) {
                (function(i) {
                    setTimeout(function() {
                        nextUpload(i);
                    }, 1);
                })(i);
            }
        }, {wpid : 1});
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

var transTasks = [ftUsers, ftCategories, ftPosts, ftQuiz, ftUploads];

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
