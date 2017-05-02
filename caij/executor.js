const log = require('../log.js');
const localcast = require('../localcast.js');

const sites = require('../sites.js');
const config = require('../config.js');
const db = require('../includes/db.js');
const topicLib = require('../topics.js');
const articleLib = require('../article.js');
const entitieLib = require('../entities.js');

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

    cacheTopic(sendback) {
        sendback();
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
