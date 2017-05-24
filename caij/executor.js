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

                    console.log(orderedSlugs);
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

    getJanitorJobs() {
        return janitorJobs;
    }

    getJanitorSites() {
        return janitorSites;
    }
}

module.exports = new Executor();
