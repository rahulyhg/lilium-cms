const log = require('../log.js');

const tasks = [];

class TaskScheduler {
    next() {
        return tasks.shift();
    }

    get workload() {
        return tasks.length;
    }

    push(taskobject) {
        log('TaskScheduler', "Pushed a task to schedule");
        tasks.push(taskobject);
    }
}

module.exports = new TaskScheduler();
