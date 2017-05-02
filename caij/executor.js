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

class RunningTask {
    constructor(taskname, extra) {
        this.taskname = taskname;
        this.extra = extra;
    }

    cacheTopic(sendback) {
        sendback();
    }

    cacheArticle(sendback) {
        sendback();
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
            }
        }
    }

    execute(task, done) {
        if (task._c) {
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
