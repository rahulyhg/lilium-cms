class Test {
    constructor(name, tasks, logger) {
        this.name = name;
        this.tasks = tasks || [];
        this.logger = logger;
        this.index = -1;

        logger.addOps(this.tasks.length);
    }

    prepare(then) {
        l("Preparing test " + this.name);
        then();
    }

    cleanUp(then) {
        l("Cleaning up test " + this.name);
        then();
    }

    addTask(task) {
        this.tasks.push(task);
        this.logger.addOps(1);
    }

    failed() {
        l('Failed task #' + (this.index+1), 'x', true);
        this.logger.skipOps(this.tasks.length - this.index);
        this.finishedCallback(false, this.tasks[this.index], this.index);
    }

    finished() {
        l(`Finished test ${this.name}`, '+');
        this.finishedCallback(true);
    }

    runNextTask() {
        const currentTask = this.tasks[++this.index];

        if (currentTask) {
            currentTask.send(success => {
                if (success) {
                    l(`Successfully ran task (${this.index+1}/${this.tasks.length})`, '+', true);
                    setImmediate(this.runNextTask.bind(this));
                } else {
                    this.failed();
                }
            });
        } else {
            this.finished();
        }
    }

    run(then) {
        l(`Running test ${this.name}`, '>');
        this.finishedCallback = then;
        this.runNextTask();
    }
}

module.exports = Test;
