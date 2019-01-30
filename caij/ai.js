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
    cooldown : 3000,

    homepageDelai : oneMinute * 5,
    sitemapDelai : oneHour,
    gaRealtimeDelai : oneSecond * 10,
    hotDelai : oneMinute * 10,
    filler3days : oneDay,
    facebookDelai : oneMinute * 3,
    sendEmailAt : "00:15:00",
    theDailyLiliumAt : "06:05:00"
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
            /*
            let jobindex = ++ai.indices.cursor % Knowledge.janitorJobs.length;
            !jobindex && ai.indices.sitecursor++;
            task = {
                taskname : Knowledge.janitorJobs[jobindex],
                extra : {
                    origin : "AI", 
                    _c : Knowledge.janitorSites[ai.indices.sitecursor % Knowledge.janitorSites.length]
                }
            };
            */

            ai.createInterval();
        } else {
            executor.execute(task, oneTime ? callback : ai.createInterval);
        }
    }

    createInterval() {
        setTimeout(() => ai.decide(), Knowledge.cooldown);
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

        let createFiller3daysTask = () => {
            Knowledge.janitorSites.forEach(_c => {
                _c.analytics.serviceaccount && taskscheduler.push({
                    taskname : "store3daysFiller",
                    extra : { origin : "AI", action : "init", _c }
                });
            });
        };

        let generateTheDailyLilium = () => {
            Knowledge.janitorSites.forEach(_c => {
                taskscheduler.push({
                    taskname : "generateTheDailyLilium",
                    extra : { origin : "AI", action : "init", _c }
                });
            });
        };

        ai.filler3days = setInterval(createFiller3daysTask, Knowledge.filler3days);
        ai.gaRealtimeInterval = setInterval(createAnalyticsTask, Knowledge.gaRealtimeDelai);
        ai.homepageInterval = setInterval(createHomepageTask, Knowledge.homepageDelai);
        ai.hotInterval = setInterval(createHotTask, Knowledge.hotDelai);
        ai.sitemapInterval = setInterval(createSitemapTask, Knowledge.sitemapDelai);
        ai.facebookInterval = setInterval(createFacebookTask, Knowledge.facebookDelai);
        
        /*
        ai.statsemailInterval = require('../scheduler.js').schedule("CAIJ_StatEmail_Networkwide", {
            runat : Knowledge.sendEmailAt
        }, createStatsEmailTask).start();
        */

        createHomepageTask();
        createFacebookTask();
        createSocialDispatchTask();
        createAnalyticsTask();
        createFiller3daysTask();
        createHotTask();

        ai.thedailyliliumInterval = require('../scheduler.js').schedule("CAIJ_The_Daily_Lilium", {
            runat : Knowledge.theDailyLiliumAt
        }, generateTheDailyLilium).start();
    }

    error(err) {
        log('CAIJ', "Caught an error at process level", 'warn');
        log('CAIJ', err, 'err');
        log("CAIJ", err.stack, 'err');

        if (global.__TEST) {
            log('CAIJ', 'Test mode will shut down the process', 'warn');
            process.exit(1);
        }

        log("CAIJ", "AI is most likely in a fail state, but won't shutdown until done manually", "warn");
        ai.createInterval();
    }

    moduleTask(messageObject) {
        const { taskname, extra } = messageObject;
        log('CAIJ', 'Received task from module ' + extra.module, 'lilium');

        executor.registerJob(taskname, (done) => {
            const callee = require(liliumroot + "/" + extra.module);
            callee[extra.call].apply(callee);
            done && done();
        });

        extra._c = Knowledge.janitorSites[extra.siteid || "default"];

        const createModuleTask = () => {
            log('CAIJ', "Creating module task : " + taskname);
            taskscheduler.push(messageObject);
        };

        if (extra.every) {
            ai["module_" + extra.call] = setInterval(createModuleTask, extra.every);
        }

        if (extra.runAt) {
            ai["module_" + extra.call] = require('../scheduler').schedule("module_" + extra.call, {
                runat : extra.runAt
            }, () => createModuleTask()).start();
        }

        !extra.notImmediate && createModuleTask();
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
