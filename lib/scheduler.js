var _c = require('../lib/config');

var _jobs = new Object();

var BGJob = function (id, intervals, ftc) {
    this.id = id;
    this.timeout = undefined;
    this.firstRun = undefined;
    this.ftc = ftc;

    this.running = false;
    this.timeToRun = intervals.runat;
    this.dayToRun = intervals.every || {};
};

BGJob.prototype.start = function () {
    var that = this;
    var timeUntilRun = that.getTimeUntilRun();
    if (timeUntilRun) {
        that.timeout = setTimeout(function () {
            that.applyFtc(that);
        }, timeUntilRun);
    }

    return that;
};

BGJob.prototype.abort = function () {
    if (this.timeout) {
        clearTimeout(this.timeout);
    }

    return this;
};

BGJob.prototype.getTimeUntilRun = function () {
    var now = new Date();
    var later = new Date();
    var at;

    // hours, minutes, seconds, day, month, day of week
    var nowArr = {
        seconds: now.getSeconds(),
        minutes: now.getMinutes(),
        hours: now.getHours(),
        day: now.getDate(),
        dayofweek: now.getDay()
    };
    var laterArr = this.timeToRun ? this.timeToRun.split(':') : [0, 0, 0];
    var laterArr = {
        hours:   parseInt(laterArr[0]),
        minutes: parseInt(laterArr[1]),
        seconds: parseInt(laterArr[2])
    };

    // Verify nearest date
    if (typeof this.dayToRun == "string") {
        var every = this.dayToRun;
        var time = now.getTime();
        var gap;

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
        var nextDay = -1;

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

BGJob.prototype.applyFtc = function (that) {
    that = that || this;
    that.start();
    that.ftc.apply(this.ftc, []);
};

var Scheduler = function () {
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
    var validateTimeStr = function (timeStr) {
        var arr = timeStr.split(':');
        var valid = true;

        if (arr.length == 3) {
            for (var i = 0; i < 3; i++) {
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

    this.remove = function (id) {
        var deleted = false;
        if (typeof _jobs[id] !== 'undefined') {
            _jobs[id].abort();
            delete _jobs[id];

            deleted = true;
        }

        return deleted;
    };

    this.schedule = function (id, intervals, ftc) {
        var job = new BGJob(id, intervals, ftc);
        var err = undefined;

        if (typeof _jobs[id] !== 'undefined') {
            err = new Error("Job with ID " + id + " already scheduled");
        } else {
            _jobs[id] = job;
        }

        return err || job;
    };
};

module.exports = new Scheduler();
