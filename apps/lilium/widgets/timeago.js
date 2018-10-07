class TimeAgo {
    constructor(unit, value) {
        this.unit = unit + (value >= 2 ? "s" : "");
        this.value = Math.floor(value);
        this.realvalue = value;
    }

    toString() {
        return (this.unit == "moments" ? ("a few moments") : (this.value + " " + this.unit)) + " ago";
    }
}

export function getTimeAgo(span) {
    const seconds = span / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    const weeks = days / 7;
    const months = days / 30;
    const years = days / 365;

    if (years >= 1) {
        return new TimeAgo("year", years);
    } if (months >= 1) {
        return new TimeAgo("month", months);
    } if (weeks >= 1) {
        return new TimeAgo("week", weeks);
    } if (days >= 1) {
        return new TimeAgo("day", days);
    } if (hours >= 1) {
        return new TimeAgo("hour", hours);
    } if (minutes >= 1) {
        return new TimeAgo("minute", minutes);
    } if (seconds >= 1) {
        return new TimeAgo("second", seconds);
    } 

    return new TimeAgo("moments", NaN);
};