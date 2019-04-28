const _jobs = {};

class BGJob {
    constructor(id, intervals, ftc) {
        this.id = id;
        this.timeout = undefined;
        this.firstRun = undefined;
        this.ftc = ftc;

        this.running = false;
        this.timeToRun = intervals.runat;
        this.dayToRun = intervals.every || {};
    }

    start () {
        const timeUntilRun = this.getTimeUntilRun();
        if (timeUntilRun) {
            this.timeout = setTimeout(() => {
                this.applyFtc();
            }, timeUntilRun);
        }

        return this;
    };

    abort () {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        return this;
    };

    getTimeUntilRun () {
        const now = new Date();
        let later = new Date();
        let at;

        // hours, minutes, seconds, day, month, day of week
        const nowArr = {
            seconds: now.getSeconds(),
            minutes: now.getMinutes(),
            hours: now.getHours(),
            day: now.getDate(),
            dayofweek: now.getDay()
        };
        let laterArr = this.timeToRun ? this.timeToRun.split(':') : [0, 0, 0];
        laterArr = {
            hours:   parseInt(laterArr[0]),
            minutes: parseInt(laterArr[1]),
            seconds: parseInt(laterArr[2])
        };

        // Verify nearest date
        if (typeof this.dayToRun == "string") {
            const every = this.dayToRun;
            const time = now.getTime();
            let gap;

            switch (every) {
                case "day":             gap = 1000 * 60 * 60 * 24; break;
                case "hour":            gap = 1000 * 60 * 60;      break;
                case "minute": default: gap = 1000 * 60;           break;
            }

            at = gap - (time % gap);
            if (at == 0) {
                at = gap;
            }
        } else if (typeof this.dayToRun.weekday !== "undefined") {
            let nextDay = -1;

            if (nowArr.dayofweek == this.dayToRun.weekday &&
                (nowArr.hours < laterArr.hours ||
                    (nowArr.hours == laterArr.hours && nowArr.minutes < laterArr.minutes) ||
                    (nowArr.hours == laterArr.hours && nowArr.minutes == laterArr.minutes && nowArr.seconds < laterArr.seconds))
            ) {
                later = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                    laterArr.hours, laterArr.minutes, laterArr.seconds, 500);
            } else {
                later.setDate(now.getDate() + (this.dayToRun.weekday + (7 - now.getDay())) % 7);
                nextDay = later.getDate();

                later = new Date(later.getFullYear(), later.getMonth(), later.getDate(),
                    laterArr.hours, laterArr.minutes, laterArr.seconds, 500);
            }
        } else if (typeof this.dayToRun.day !== "undefined") {
            if (nowArr.day == this.dayToRun.day &&
                (nowArr.hours < laterArr.hours ||
                    (nowArr.hours == laterArr.hours && nowArr.minutes < laterArr.minutes) ||
                    (nowArr.hours == laterArr.hours && nowArr.minutes == laterArr.minutes && nowArr.seconds < laterArr.seconds))
            ) {
                later = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                    laterArr.hours, laterArr.minutes, laterArr.seconds, 500);
            } else {
                later = new Date(now.getFullYear(), now.getMonth() + (nowArr.day < this.dayToRun.day ? 0 : 1), this.dayToRun.day,
                    laterArr.hours, laterArr.minutes, laterArr.seconds, 500);
            }
        } else if (typeof this.dayToRun.secondCount !== "undefined") {
            later = new Date(now.getTime() + (this.dayToRun.secondCount * 1000));
        } else {
            if ((nowArr.hours < laterArr.hours ||
                    (nowArr.hours == laterArr.hours && nowArr.minutes < laterArr.minutes) ||
                    (nowArr.hours == laterArr.hours && nowArr.minutes == laterArr.minutes && nowArr.seconds < laterArr.seconds))) {

                later = new Date(
                    now.getFullYear(), now.getMonth(), now.getDate(),
                    laterArr.hours, laterArr.minutes, laterArr.seconds, 500
                );
            } else {
                later = new Date(
                    now.getFullYear(), now.getMonth(), now.getDate() + 1,
                    laterArr.hours, laterArr.minutes, laterArr.seconds, 500
                );
            }
        }

        return at || (later - now);
    };

    applyFtc () {
        this.start();
        this.ftc.apply(this.ftc, []);
    };
};

class Scheduler {
    // Intervals structure 
    /*
    	{
    		runat : "12:00:00", // time string
    		every : {
    			secondCount : int
    			day : 0-31,
    			weekday : 0-6 (0 is Sunday)
    		} || "minute", "hour", "day"
    	}
    */
    validateTimeStr(timeStr) {
        const arr = timeStr.split(':');
        let valid = true;

        if (arr.length == 3) {
            for (let i = 0; i < 3; i++) {
                if (isNaN(arr[i])) {
                    valid = false;
                    break;
                }
            }
        } else {
            valid = false;
        }

        return valid;
    };

    remove(id) {
        let deleted = false;
        if (typeof _jobs[id] !== 'undefined') {
            _jobs[id].abort();
            delete _jobs[id];

            deleted = true;
        }

        return deleted;
    };

    schedule(id, intervals, ftc) {
        const job = new BGJob(id, intervals, ftc);
        let err = undefined;

        if (typeof _jobs[id] !== 'undefined') {
            err = new Error("Job with ID " + id + " already scheduled");
        } else {
            _jobs[id] = job;
        }

        return err || job;
    };
};

module.exports = new Scheduler();
