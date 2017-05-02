const taskscheduler = require('./taskscheduler.js');
const executor = require('./executor.js');

const log = require('../log.js');

const Knowledge = {
    queueMaxSize : 25,
    cacheDept : 1000,
    janitorJobs : executor.getJanitorJobs(),
    janitorSites : executor.getJanitorSites(),
    cpuCap : 80,
    cooldown : 1000
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
        let task;

        if (taskscheduler.workload > Knowledge.queueMaxSize) {
            task = taskscheduler.next();
        } else {
            let jobindex = ++ai.indices.cursor % Knowledge.janitorJobs.length ;
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

    bringToLife() {
        log('CAIJ', 'Brought to life', 'lilium');

        if (Knowledge.janitorSites.length == 0) {
            log('CAIJ', "No website supporting CAIJ; Aborting", "warn");
        } else {
            log('CAIJ', "Starting CAIJ with " + Knowledge.janitorSites.length + " websites");
            ai.createInterval();
        }
    }
}

const ai = new AI();
module.exports = ai;
