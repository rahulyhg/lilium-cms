const taskscheduler = require('./taskscheduler.js');
const executor = require('./executor.js');

const log = require('../log.js');

const Knowledge = {
    queueMaxSize : 25,
    cacheDept : 1000,
    janitorJobs : executor.getJanitorJobs(),
    janitorSites : executor.getJanitorSites(),
    cpuCap : 80,
    cooldown : 100,

    homepageDelai : 1000 * 60 * 30,
    sitemapDelai : 1000 * 60 * 60,
    sendEmailAt : "00:15:00"
};

class AI {
    constructor() {
        this.indices = {
            jobs : {},
            cursor : 0,
            sitecursor : 0
        };
    }

    decide() {
        let task = taskscheduler.next();

        if (!task) {
            let jobindex = ++ai.indices.cursor % Knowledge.janitorJobs.length;
            !jobindex && ai.indices.sitecursor++;
            task = {
                taskname : Knowledge.janitorJobs[jobindex],
                extra : {
                    origin : "AI", 
                    _c : Knowledge.janitorSites[ai.indices.sitecursor % Knowledge.janitorSites.length]
                }
            };
        }

        executor.execute(task, ai.createInterval);
    }

    createInterval() {
        setTimeout(ai.decide, Knowledge.cooldown);
    }

    createTaskInserter() {
        let createHomepageTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                taskscheduler.push({
                    taskname : "refreshHomepage",
                    extra : {
                        origin : "AI",
                        _c : _c
                    }
                });
            });
        };

        let createSitemapTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                taskscheduler.push({
                    taskname : "refreshSitemaps",
                    extra : {
                        origin : "AI",
                        _c : _c
                    }
                });
            });
        };

        let createStatsEmailTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                taskscheduler.push({
                    taskname : "statsEmail",
                    extra : {
                        origin : "AI",
                        _c : _c
                    }
                });
            });
        };

        ai.homepageInterval = setInterval(createHomepageTask, Knowledge.homepageDelai);
        ai.sitemapInterval = setInterval(createSitemapTask, Knowledge.sitemapDelai);
        ai.statsemailInterval = require('../scheduler.js').schedule("CAIJ_StatEmail_Networkwide", {
            runat : Knowledge.sendEmailAt
        }, createStatsEmailTask).start();

        createHomepageTask();
    }

    error(err) {
        log('CAIJ', "Caught an error at process level", 'warn');
        log('CAIJ', err, 'err');
        log("CAIJ", "AI is most likely in a fail state, but won't shutdown until done manually", "warn");

        ai.createInterval();
    }

    bringToLife() {
        log('CAIJ', 'Brought to life', 'lilium');

        if (Knowledge.janitorSites.length == 0) {
            log('CAIJ', "No website supporting CAIJ; Aborting", "warn");
        } else {
            log('CAIJ', "Starting CAIJ with " + Knowledge.janitorSites.length + " websites");
            ai.createInterval();
            ai.createTaskInserter();
        }

        process.on('uncaughtException', ai.error);
    }
}

const ai = new AI();
module.exports = ai;
