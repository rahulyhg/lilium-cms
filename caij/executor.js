const log = require('../log.js');
const localcast = require('../localcast.js');
const request = require('request');

const sites = require('../sites.js');
const config = require('../config.js');
const hooks = require('../hooks.js');
const db = require('../includes/db.js');
const sitemapLib = require('../sitemap.js');
const topicLib = require('../topics.js');
const articleLib = require('../article.js');
const entitieLib = require('../entities.js');
const analyticsLib = require('../analytics.js');

const janitorJobs = [
    "cacheTopic",
    "cacheArticle",
    "cacheEntity"
];

const janitorSites = [];
const janitorStats = {};

class RunningTask {
    constructor(taskname, extra) {
        this.taskname = taskname;
        this.extra = extra;
        this._c = extra._c;
        this.stats = janitorStats[this._c.uid];
    }

    socialDispatch(sendback) {
        let action = this.extra.action;

        log("RunningTask", "Executing socialDispatch task with action : " + action);
        const socialDispatchLib = require('../socialdispatch.js');

        switch (action) {
            case "commit":
                socialDispatchLib.getSingle(this._c, db.mongoID(this.extra._id), (scheduledpost) => {
                    scheduledpost && scheduledpost.status == "scheduled" && scheduledpost.commit();
                    sendback();
                });
                break;

            case "remove":
                socialDispatchLib.getSingle(this._c, db.mongoID(this.extra._id), (scheduledpost) => {
                    scheduledpost && scheduledpost.cancel();
                    sendback();
                });
                break;

            case "init":
                socialDispatchLib.init();
                sendback();
                break;

            default:
                sendback(new Error("Undefined action for socialDispatch task"));
        }
    }

    // Uses Graph v2.8 structure, not tested on other versions
    storeFacebookShares(sendback, secondpass) {
        if (!this._c.social || !this._c.social.facebook) {
            return sendback();
        }

        const FBMax = 50;
        if (!this.stats.fb) { this.stats.fb = 0; }
        const _c = this._c;
        const that = this;

        const saveCounts = (articles) => {
            this.stats.fb += FBMax;
            let saveIndex = -1;
            let nextSave = () => {
                if (++saveIndex == articles.length) {
                    sendback();
                } else {
                    let art = articles[saveIndex];

                    art.updated ? 
                        db.update(_c, 'content', {_id : art._id}, { 
                            shares : art.shares, 
                            comments : art.comments, 
                            facebooklastupdate : new Date() 
                        }, nextSave) :
                        nextSave();
                }
            };

            nextSave();
        };

        db.findToArray(this._c, 'topics', {}, (err, arr) => {
            let topicAssoc = {};
            arr.forEach(x => { topicAssoc[x._id] = x; });

            db.find(this._c, 'content', {status : "published", topic : {$exists : 1}}, [], (err, cur) => {
                cur .project({topic : 1, name : 1, _id : 1, shares : 1})
                    .sort({_id : -1})
                    .limit(FBMax)
                    .skip(this.stats.fb)
                    .toArray(
                (err, articles) => {
                    if (articles.length == 0) {
                        that.stats.fb = 0;
                        return secondpass ? sendback() : that.storeFacebookShares(sendback, true);
                    }

                    let urlString = "";
                    let articleAssoc = [];
                    articles.forEach(a => {
                        if (topicAssoc[a.topic]) {
                            a.url = _c.server.protocol + _c.server.url + "/" + topicAssoc[a.topic].completeSlug + "/" + a.name;
                            urlString += (urlString?",":"") + a.url;
                            articleAssoc[a.url] = a;
                        }
                    });

                    urlString = "https://graph.facebook.com/v2.8/?access_token=" + 
                        _c.social.facebook.token +
                        "&ids=" +
                        urlString;

                    request(urlString, (_1, _2, resp) => {
                        try {
                            let respObj = JSON.parse(resp || {});

                            if (respObj.error) {
                                log('CAIJ', "Facebook Graph ["+respObj.error.OAuthException+"] returned from bulk request with message : " + respObj.error.message, 'warn');
                                return sendback();
                            }

                            for (let furl in respObj) {
                                let graphObj = respObj[furl];
                                let art = articleAssoc[furl];
                                let shares = graphObj.share && graphObj.share.share_count || 0;

                                if (art && art.shares != shares) {
                                    art.shares = shares;
                                    art.comments = graphObj.share && graphObj.share.comment_count || 0;
                                    art.updated = true;
                                } else {
                                    log('CAIJ', 'Skipping URL from FB : ' + furl);
                                }
                            }
                        } catch (ex) {
                            log('CAIJ', 'Caught exception while parsing Graph response : ' + ex, 'warn');
                        }

                        saveCounts(articles);
                    });
                });
            });
        });
    }

    refreshSitemaps(sendback) {
        sitemapLib.generateSitemap(this._c, sendback);
    }

    refreshTopicLatests(sendback) {
        log('RunningTask', "Recreating all topic latests");
        let conf = this._c;
        db.findToArray(conf, 'topics', {}, (err, arr) => {
            let i = -1;
            let next = () => {
                if (++i == arr.length) {
                    sendback();
                } else {
                    topicLib.generateTopicLatestJSON(conf, arr[i]._id, next);
                }
            };

            next();
        }, {_id : 1});
    }

    storeRealtime(sendback) {
        analyticsLib.storeRealtime(this._c, (err) => {
            sendback();
        });
    }

    statsEmail(sendback) {
        analyticsLib.addSite(_c, (err) => {
            if (err) {
                log("RunningTask", "Error sending emails : " + err, "err");
                sendback();
            } else {
                analyticsLib.getData(_c, {
                    "start-date" : "yesterday",
                    "end-date" : "yesterday",
                    "metrics" : "ga:users,ga:pageviews,ga:sessions",
                    "dimensions" : "ga:pagePath",
                    "sort" : "-ga:pageviews",
                    "max-results" : 10
                }, (err, result) => {
                    let metrics = {
                        users : result.totalsForAllResults["ga:users"],
                        pageviews : result.totalsForAllResults["ga:pageviews"],
                        sessions : result.totalsForAllResults["ga:sessions"]
                    };
                    let articles = result.rows;
                    let slugs = {};
                    let orderedSlugs = [];
                    let finalObjects = [];

                    for (let i = 0; i < articles.length; i++) {
                        let url = articles[i][0].split('/');
                        let slug = url.pop();

                        if (!isNaN(slug)) {
                            slug = url.pop();
                        }

                        if (!slug) {
                            continue;
                        }

                        if (!slugs[slug]) {
                            slugs[slug] = {
                                slug : slug,
                                users : articles[i][1],
                                pageviews : articles[i][2],
                                sessions : articles[i][3]
                            };
                            orderedSlugs.push(slug);
                        } else {
                            let current = slugs[slug];
                            current.users += articles[i][1];
                            current.pageviews += articles[i][2];
                            current.sessions += articles[i][3];
                        }
                    }

                    articleLib.batchFetch(_c, orderedSlugs, deepArticles => {
                        let finalArray = [];
                        deepArticles.forEach(art => {
                            if (art) {
                                art.stats = slugs[art.name];
                                finalArray.push(art);
                            }
                        });

                        sendback();
                    });
                });
            }
        });
    }

    refreshHomepage(sendback) {
        let trigger = hooks.getHooksFor('homepage_needs_refresh_' + this._c.uid);
        let firstKey = Object.keys(trigger).shift();
        if (firstKey) {
            trigger[firstKey].cb({
                _c : this._c,
                callback : sendback
            });
        } else {
            sendback();
        }
    }

    cacheTopic(sendback) {
        let trigger = hooks.getHooksFor('topic_needs_refresh_' + this._c.uid);
        let firstKey = Object.keys(trigger).shift();
        if (!firstKey) {
            return sendback();
        }

        let stats = janitorStats[this._c.uid].cacheTopic;
        stats.skip = (stats.skip || 0) + 1;

        db.rawCollection(this._c, 'topics', {}, (err, collection) => {
            collection.find({lastUsed : {$exists : 1}})
                .project({_id : 1, displayname : 1, completeSlug : 1})
                .sort({_id : -1})
                .skip(stats.skip)
                .next(
            (err, topic) => {
                 if (err) {
                    log('RunningTask', 'Database error in task cacheTopic : ' + err);
                    sendback();
                } else if (topic) {
                    log('RunningTask', "Generating topic : " + topic.displayname + " @ " + topic.completeSlug, 'info');
                    topicLib.deepFetch(this._c, topic._id, (topic) => {
                        trigger[firstKey].cb({
                            _c : this._c,
                            topic : topic,
                            index : 1,
                            callback : (() => {
                                let trigger = hooks.getHooksFor('rss_needs_refresh_' + this._c.uid);
                                let firstKey = Object.keys(trigger).shift();
                                if (!firstKey) {
                                    return sendback();
                                }

                                log('RunningTask', 'Generating RSS feed');
                                trigger[firstKey].cb({
                                    _c : this._c,
                                    topic : topic,
                                    callback : sendback
                                });
                            }).bind(this)
                        });
                    });

                } else {
                    log('RunningTask', 'No article topic at index ' + stats.skip);
                    stats.skip = 0;
                    sendback();
                }
            });
        });
    }

    cacheArticle(sendback) {
        let stats = janitorStats[this._c.uid].cacheArticle;
        stats.skip = (stats.skip || 0) + 1;

        db.rawCollection(this._c, 'content', {}, (err, collection) => {
            collection.find({status : "published"})
                .project({_id : 1, title : 1})
                .sort({_id : -1})
                .skip(stats.skip)
                .next(
            (err, article) => {
                if (err) {
                    log('RunningTask', 'Database error in task cacheArticle : ' + err);
                    sendback();
                } else if (article) {
                    log('RunningTask', "Generating article : " + article.title, 'info');
                    articleLib.generateArticle(this._c, article._id, sendback);
                } else {
                    log('RunningTask', 'No article found at index ' + stats.skip);
                    stats.skip = 0;
                    sendback();
                }
            });
        });
    }

    cacheEntity(sendback) {
        sendback();
    }

    run(sendback) {
        log('RunningTask', 'Executing task type ' + this.taskname + ' for site ' + this.extra._c.id);
        this[this.taskname].apply(this, [sendback]);
    }
}

class Executor {
    constructor() {
        let sites = config.getAllSites();

        for (let i = 0; i < sites.length; i++) {
            if (sites[i].caij === true) {
                log('CAIJ', "Adding site to CAIJ janitor sites");
                janitorSites.push(sites[i]);
                janitorStats[sites[i].uid] = {};

                if (sites[i].default) {
                    janitorSites.default = sites[i];
                }

                for (let j = 0; j < janitorJobs.length; j++) {
                    janitorStats[sites[i].uid][janitorJobs[j]] = {};
                }
            }
        }
    }

    execute(task, done) {
        if (task.extra.siteid) {
            task.extra._c = config.fetchConfig(task.extra.siteid);
        }

        if (task.extra._c) {
            let runningtask = new RunningTask(task.taskname, task.extra);
            runningtask.run(done);
        } else {
            log('Executor', 'Missing site config', 'warn');
            done && done();
        }
    };

    registerJob(task, callback) {
        RunningTask.prototype[task] = callback;
    }

    getJanitorJobs() {
        return janitorJobs;
    }

    getJanitorSites() {
        return janitorSites;
    }
}

module.exports = new Executor();
