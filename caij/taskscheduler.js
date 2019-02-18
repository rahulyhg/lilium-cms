const tasks = [];

class TaskScheduler {
    next() {
        return tasks.shift();
    }

    get workload() {
        return tasks.length;
    }

    prepend(taskobject) {
        log('TaskScheduler', "Pushed priority task");
        task.unshift(taskobject);
    }

    push(taskobject) {
        log('TaskScheduler', "Pushed a task to schedule");
        tasks.push(taskobject);
    }
}

module.exports = new TaskScheduler();
