const taskscheduler = require('./taskscheduler.js');
const executor = require('./executor.js');

const log = require('../log.js');

const oneSecond = 1000;
const oneMinute = oneSecond * 60;
const halfHour = oneMinute * 30;
const oneHour = oneMinute * 60;
const halfDay = oneHour * 12;
const oneDay = oneHour * 24;
const oneWeek = oneDay * 7;

const Knowledge = {
    queueMaxSize : 100,
    cacheDept : 1000,
    janitorJobs : executor.getJanitorJobs(),
    janitorSites : executor.getJanitorSites(),
    cpuCap : 80,
    cooldown : 100,

    homepageDelai : oneMinute * 5,
    sitemapDelai : oneHour,
    gaRealtimeDelai : oneSecond * 10,
    hotDelai : oneMinute * 10,
    facebookDelai : oneMinute * 3,
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

    decide(oneTime, callback) {
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

        executor.execute(task, oneTime ? callback : ai.createInterval);
    }

    createInterval() {
        setTimeout(ai.decide, Knowledge.cooldown);
    }

    createTaskInserter() {
        let createHomepageTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                taskscheduler.push({
                    taskname : "refreshHomepage",
                    extra : { origin : "AI", _c }
                });
            });
        };

        let createSitemapTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                taskscheduler.push({
                    taskname : "refreshSitemaps",
                    extra : { origin : "AI", _c }
                });
            });
        };

        let createHotTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                taskscheduler.push({
                    taskname : "storeHot",
                    extra : { origin : "AI", _c }
                });
            });
        };

        let createStatsEmailTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                taskscheduler.push({
                    taskname : "statsEmail",
                    extra : { origin : "AI", _c }
                });
            });
        };

        let createFacebookTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                taskscheduler.push({
                    taskname : "storeFacebookShares",
                    extra : { origin : "AI", _c }
                });
            });
        };

        let createSocialDispatchTask = () => {
            taskscheduler.push({
                taskname : "socialDispatch",
                extra : {
                    origin : "AI",
                    action : "init",
                    _c : require("../config.js").default()
                }
            });
        };

        let createAnalyticsTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                _c.analytics.serviceaccount && taskscheduler.push({
                    taskname : "storeRealtime",
                    extra : { origin : "AI", action : "init", _c }
                });
            });
        };

        ai.gaRealtimeInterval = setInterval(createAnalyticsTask, Knowledge.gaRealtimeDelai);
        ai.homepageInterval = setInterval(createHomepageTask, Knowledge.homepageDelai);
        ai.hotInterval = setInterbal(createHotTask, Knowledge.hotDelai);
        ai.sitemapInterval = setInterval(createSitemapTask, Knowledge.sitemapDelai);
        ai.facebookInterval = setInterval(createFacebookTask, Knowledge.facebookDelai);
        ai.statsemailInterval = require('../scheduler.js').schedule("CAIJ_StatEmail_Networkwide", {
            runat : Knowledge.sendEmailAt
        }, createStatsEmailTask).start();

        createHomepageTask();
        createFacebookTask();
        createSocialDispatchTask();
        createAnalyticsTask();
        createHotTask();
    }

    error(err) {
        log('CAIJ', "Caught an error at process level", 'warn');
        log('CAIJ', err, 'err');
        log("CAIJ", err.stack, 'err');
        log("CAIJ", "AI is most likely in a fail state, but won't shutdown until done manually", "warn");

        ai.createInterval();
    }

    moduleTask(messageObject) {
        const { taskname, extra } = messageObject;
        log('CAIJ', 'Received task from module ' + extra.module, 'lilium');

        executor.registerJob(taskname, (done) => {
            const callee = require(extra._c.server.base + "/" + extra.module);
            callee[extra.call](this, () => {
                done();
            });
        });

        extra._c = Knowledge.janitorSites[extra.siteid || "default"];

        const createModuleTask = () => {
            log('CAIJ', "Creating module task : " + taskname);
            taskscheduler.push(messageObject);
        };

        if (extra.every) {
            ai["module_" + extra.call] = setInterval(createModuleTask, extra.every);
        }
        createModuleTask();
    }

    bringToLife() {
        log('CAIJ', 'Brought to life', 'lilium');

        if (Knowledge.janitorSites.length == 0) {
            log('CAIJ', "No website supporting CAIJ; Aborting", "warn");
        } else {
            log('CAIJ', "Starting CAIJ with " + Knowledge.janitorSites.length + " websites", "lilium");
            ai.createInterval();
            ai.createTaskInserter();
        }

        process.on('uncaughtException', ai.error);
    }
}

const ai = new AI();
module.exports = ai;
